import React, { useState, useEffect } from "react";
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


// --- Supabase setup ---
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
import { createClient } from "@supabase/supabase-js";

console.log("Supabase URL:", SUPABASE_URL);
console.log("Supabase KEY:", SUPABASE_ANON_KEY ? "Loaded" : "Missing");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// --- Background location task name ---
const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// --- Define TaskManager safely ---
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background location error:", error);
    return;
  }
  if (data && data.locations) {
    for (const loc of data.locations) {
      console.log("Background location:", loc.coords);

      // Send location to Supabase
      const { error } = await supabase.from("driver_locations").insert([
        {
          driver_id: global.driverId || "unknown",
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        },
      ]);

      if (error) console.error("Supabase insert error:", error.message,error.details);
    }
  }
});

export default function App() {
  const [driverId, setDriverId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [buses, setBuses] = useState([
    { id: 1, name: "Bus 1" },
    { id: 2, name: "Bus 2" },
  ]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [watcher, setWatcher] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // --- Driver Login ---
  const handleLogin = () => {
    if (!driverId.trim()) {
      Alert.alert("Error", "Please enter Driver ID");
      return;
    }
    setLoggedIn(true);
    setSelectedBus(buses[0].id);
    global.driverId = driverId; // save globally for background task
  };

  // --- Start / Stop tracking ---
  const toggleTracking = async () => {
    if (tracking) {
      if (watcher) watcher.remove();
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      setTracking(false);
      setWatcher(null);
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        return;
      }

      const w = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        async (loc) => {
          setLocation(loc.coords);
          setLastUpdated(new Date());
          // Send location to Supabase immediately
          const { error } = await supabase.from("driver_locations").insert([
            {
              driver_id: driverId,
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            },
          ]);
          if (error){ console.error("Supabase insert error:", error)}
          else console.log("Inserted successfully:", data);
        }
      );
      setWatcher(w);
      setTracking(true);

      // --- Start background location updates ---
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Driver Tracking Active",
          notificationBody: "Your location is being tracked in background",
        },
      });
    }
  };

  // --- Battery level ---
  useEffect(() => {
    const getBattery = async () => {
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(Math.floor(level * 100));
    };
    getBattery();
    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(Math.floor(batteryLevel * 100));
    });
    return () => subscription.remove();
  }, []);

  // --- Update every second for "last updated" ---
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated((prev) => prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Login screen ---
  if (!loggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Driver Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Driver ID"
          value={driverId}
          onChangeText={(text) => setDriverId(text)}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Main screen ---
  const secondsAgo = lastUpdated
    ? Math.floor((new Date() - lastUpdated) / 1000)
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>

      <Text style={styles.label}>Select Bus:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedBus}
          onValueChange={(val) => setSelectedBus(val)}
          style={styles.picker}
        >
          {buses.map((bus) => (
            <Picker.Item key={bus.id} label={bus.name} value={bus.id} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
        onPress={toggleTracking}
      >
        <Text style={styles.buttonText}>
          {tracking ? "Stop Tracking" : "Start Tracking"}
        </Text>
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

      <Text style={styles.text}>
        {batteryLevel !== null ? `Battery: ${batteryLevel}%` : "Loading battery..."}
      </Text>
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
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
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
  picker: {
    width: "100%",
  },
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
  text: {
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
    color: "#555",
  },
});


