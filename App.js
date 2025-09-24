import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  AppState,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Battery from "expo-battery";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// 🟢 global cache for background task
let driverCache = { driverId: null, busId: null };

// --- Define background task ---
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background location error:", error);
    return;
  }

  if (data && data.locations && driverCache.driverId && driverCache.busId) {
    for (const loc of data.locations) {
      const payload = {
        driver_id: driverCache.driverId,
        bus_id: driverCache.busId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        recorded_at: new Date().toISOString(),
      };

      console.log("Background location sending:", payload);

      const { error: insertError } = await supabase
        .from("driver_locations")
        .insert([payload]);
      if (insertError)
        console.error("Supabase background insert error:", insertError);
    }
  }
});

export default function App() {
  const [driverId, setDriverId] = useState("");
  const [busId, setBusId] = useState(1);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const foregroundWatcher = useRef(null);
  const appState = useRef(AppState.currentState);

  const buses = [
    { id: 1, name: "Bus 1" },
    { id: 2, name: "Bus 2" },
    { id: 3, name: "Bus 3" },
  ];

  // --- AppState listener to start/stop background tracking ---
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [tracking]);

  const handleAppStateChange = async (nextAppState) => {
    if (!tracking) return;

    if (
      appState.current.match(/active/) &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log("App went to background → start background tracking");
      await startBackgroundTracking();
    } else if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("App came to foreground → stop background tracking");
      await stopBackgroundTracking();
    }

    appState.current = nextAppState;
  };

  // --- Login / Logout ---
  const handleLogin = async () => {
    if (!driverId.trim()) {
      Alert.alert("Error", "Please enter Driver ID");
      return;
    }

    // 🟢 stop any leftover tracking before new login
    await stopTracking();

    driverCache = { driverId, busId }; // update global cache
    setLoggedIn(true);

    // battery check on login
    const level = await Battery.getBatteryLevelAsync();
    if (level < 0.15) {
      setErrorMessage("⚠️ Battery low, please charge device");
    } else {
      setErrorMessage(null);
    }
  };

  const handleLogout = async () => {
    await stopTracking(); // 🟢 stop everything first
    driverCache = { driverId: null, busId: null }; // clear cache
    setDriverId("");
    setBusId(1);
    setLoggedIn(false);
    setErrorMessage(null);
  };

  // --- Foreground Tracking ---
  const startForegroundTracking = async () => {
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      Alert.alert("Permission Denied", "Foreground location permission required");
      return;
    }

    if (foregroundWatcher.current) return; // already tracking

    foregroundWatcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 0,
      },
      async (loc) => {
        try {
          setLocation(loc.coords);
          setLastUpdated(new Date());

          const payload = {
            driver_id: driverId,
            bus_id: busId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            recorded_at: new Date().toISOString(),
          };

          console.log("Foreground location sending:", payload);

          const { error } = await supabase
            .from("driver_locations")
            .insert([payload]);

          if (error) {
            console.error("Supabase foreground insert error:", error);
            setErrorMessage("⚠️ Network issue, location not sent");
          } else {
            setErrorMessage(null);
          }
        } catch (err) {
          console.error("Unexpected error:", err);
          setErrorMessage("⚠️ Error sending location");
        }
      }
    );
  };

  const stopForegroundTracking = async () => {
    if (foregroundWatcher.current) {
      foregroundWatcher.current.remove();
      foregroundWatcher.current = null;
    }
  };

  // --- Background Tracking ---
  const startBackgroundTracking = async () => {
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Background location permission required"
      );
      return;
    }

    const isRegistered = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 20,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Driver Tracking Active",
          notificationBody: "Your location is being tracked in background",
        },
        pausesUpdatesAutomatically: false,
      });
    }
  };

  const stopBackgroundTracking = async () => {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  };

  // --- Toggle tracking ---
  const startTracking = async () => {
    setTracking(true);
    await startForegroundTracking();
  };

  const stopTracking = async () => {
    setTracking(false);
    await stopForegroundTracking();
    await stopBackgroundTracking();
  };

  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Driver Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Driver ID"
          value={driverId}
          onChangeText={setDriverId}
          placeholderTextColor="#aaa"
        />
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={busId}
            onValueChange={setBusId}
            style={styles.picker}
          >
            {buses.map((bus) => (
              <Picker.Item key={bus.id} label={bus.name} value={bus.id} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const secondsAgo = lastUpdated
    ? Math.floor((new Date() - lastUpdated) / 1000)
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>
      <Text style={styles.text}>Driver: {driverId}</Text>
      <Text style={styles.text}>
        Bus: {buses.find((b) => b.id === busId)?.name || "Unknown"}
      </Text>

      <TouchableOpacity
        style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
        onPress={tracking ? stopTracking : startTracking}
      >
        <Text style={styles.buttonText}>
          {tracking ? "Stop Tracking" : "Start Tracking"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#6c757d" }]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.status}>
        Status: {tracking ? "✅ Tracking Active" : "⚠️ Offline"}
      </Text>

      <Text style={styles.text}>
        {location
          ? `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
          : "Waiting for location..."}
      </Text>

      <Text style={styles.text}>
        {secondsAgo !== null
          ? `Last updated: ${secondsAgo} sec ago`
          : "Not updated yet"}
      </Text>

      {errorMessage && (
        <Text style={{ color: "red", marginTop: 10, textAlign: "center" }}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 25,
  },
  input: {
    width: "85%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  pickerWrapper: {
    width: "85%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  picker: { width: "100%" },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 10,
    width: "85%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  status: { marginTop: 20, fontSize: 16, fontWeight: "bold" },
  text: { fontSize: 14, marginTop: 10, textAlign: "center", color: "#555" },
});
