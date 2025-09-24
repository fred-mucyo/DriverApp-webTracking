// import React, { useState, useEffect } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   AppState,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import * as Location from "expo-location";
// import * as TaskManager from "expo-task-manager";
// import * as Battery from "expo-battery";


// // --- Supabase setup ---
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
// import { createClient } from "@supabase/supabase-js";

// console.log("Supabase URL:", SUPABASE_URL);
// console.log("Supabase KEY:", SUPABASE_ANON_KEY ? "Loaded" : "Missing");

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// // --- Background location task name ---
// const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// // --- Define TaskManager safely ---
// TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
//   if (error) {
//     console.error("Background location error:", error);
//     return;
//   }
//   if (data && data.locations) {
//     for (const loc of data.locations) {
//       console.log("Background location:", loc.coords);

//       // Send location to Supabase
//       const { error } = await supabase.from("driver_locations").insert([
//         {
//           driver_id: global.driverId || "unknown",
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         },
//       ]);

//       if (error) console.error("Supabase insert error:", error.message,error.details);
//     }
//   }
// });

// export default function App() {
//   const [driverId, setDriverId] = useState("");
//   const [loggedIn, setLoggedIn] = useState(false);
//   const [buses, setBuses] = useState([
//     { id: 1, name: "Bus 1" },
//     { id: 2, name: "Bus 2" },
//   ]);
//   const [selectedBus, setSelectedBus] = useState(null);
//   const [tracking, setTracking] = useState(false);
//   const [location, setLocation] = useState(null);
//   const [watcher, setWatcher] = useState(null);
//   const [batteryLevel, setBatteryLevel] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);

//   // --- Driver Login ---
//   const handleLogin = () => {
//     if (!driverId.trim()) {
//       Alert.alert("Error", "Please enter Driver ID");
//       return;
//     }
//     setLoggedIn(true);
//     setSelectedBus(buses[0].id);
//     global.driverId = driverId; // save globally for background task
//   };
// // --- Start / Stop tracking ---
// const toggleTracking = async () => {
//   if (tracking) {
//     // Stop tracking
//     if (watcher) watcher.remove();
//     await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//     setTracking(false);
//     setWatcher(null);
//     console.log("Tracking stopped");
//   } else {
//     // Request permissions
//     const { status } = await Location.requestForegroundPermissionsAsync();
//     const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
//     if (status !== "granted" || bgStatus !== "granted") {
//       Alert.alert("Permission Denied", "Location permission is required");
//       return;
//     }

//     // --- Foreground tracking (updates UI + sends to Supabase) ---
//     const w = await Location.watchPositionAsync(
//       {
//         accuracy: Location.Accuracy.High,
//         timeInterval: 5000,
//         distanceInterval: 5,
//       },
//       async (loc) => {
//         setLocation(loc.coords);
//         setLastUpdated(new Date());

//         // Send location to Supabase
//         const { error } = await supabase.from("driver_locations").insert([
//           {
//             driver_id: driverId,
//             bus_id: selectedBus?.toString() || "unknown",
//             latitude: loc.coords.latitude,
//             longitude: loc.coords.longitude,
//           },
//         ]);
//         if (error) console.error("Supabase insert error (foreground):", error);
//       }
//     );
//     setWatcher(w);

//     // --- Background tracking (runs even if app is closed) ---
//     await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
//       accuracy: Location.Accuracy.High,
//       timeInterval: 5000,       // every 5 seconds
//       distanceInterval: 5,      // every 5 meters
//       deferredUpdatesInterval: 5000, // ensures regular updates in background
//       showsBackgroundLocationIndicator: true,
//       foregroundService: {
//         notificationTitle: "Driver Tracking Active",
//         notificationBody: "Your location is being tracked in background",
//       },
//       pausesUpdatesAutomatically: false, // ensures updates are not paused
//     });

//     setTracking(true);
//     console.log("Tracking started");
//   }
// };

// // --- Background task ---
// TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
//   if (error) {
//     console.error("Background location error:", error);
//     return;
//   }
//   if (data && data.locations) {
//     for (const loc of data.locations) {
//       console.log("Background location:", loc.coords);

//       // Send updated location to Supabase
//       const { error } = await supabase.from("driver_locations").insert([
//         {
//           driver_id: global.driverId || "unknown",
//           bus_id: global.selectedBus?.toString() || "unknown",
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         },
//       ]);
//       if (error) console.error("Supabase insert error (background):", error);
//     }
//   }
// });

//   // --- Battery level ---
//   useEffect(() => {
//     const getBattery = async () => {
//       const level = await Battery.getBatteryLevelAsync();
//       setBatteryLevel(Math.floor(level * 100));
//     };
//     getBattery();
//     const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
//       setBatteryLevel(Math.floor(batteryLevel * 100));
//     });
//     return () => subscription.remove();
//   }, []);

//   // --- Update every second for "last updated" ---
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setLastUpdated((prev) => prev);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   // --- Login screen ---
//   if (!loggedIn) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.title}>Driver Login</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter Driver ID"
//           value={driverId}
//           onChangeText={(text) => setDriverId(text)}
//           placeholderTextColor="#aaa"
//         />
//         <TouchableOpacity style={styles.button} onPress={handleLogin}>
//           <Text style={styles.buttonText}>Login</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // --- Main screen ---
//   const secondsAgo = lastUpdated
//     ? Math.floor((new Date() - lastUpdated) / 1000)
//     : null;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Driver Dashboard</Text>

//       <Text style={styles.label}>Select Bus:</Text>
//       <View style={styles.pickerWrapper}>
//         <Picker
//           selectedValue={selectedBus}
//           onValueChange={(val) => setSelectedBus(val)}
//           style={styles.picker}
//         >
//           {buses.map((bus) => (
//             <Picker.Item key={bus.id} label={bus.name} value={bus.id} />
//           ))}
//         </Picker>
//       </View>

//       <TouchableOpacity
//         style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
//         onPress={toggleTracking}
//       >
//         <Text style={styles.buttonText}>
//           {tracking ? "Stop Tracking" : "Start Tracking"}
//         </Text>
//       </TouchableOpacity>

//       <Text style={styles.status}>
//         Status: {tracking ? "✅ Tracking Active" : "⚠️ Offline"}
//       </Text>

//       <Text style={styles.text}>
//         {location
//           ? `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
//           : "Waiting for location..."}
//       </Text>

//       <Text style={styles.text}>
//         {secondsAgo !== null
//           ? `Last updated: ${secondsAgo} sec ago`
//           : "Not updated yet"}
//       </Text>

//       <Text style={styles.text}>
//         {batteryLevel !== null ? `Battery: ${batteryLevel}%` : "Loading battery..."}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f7f9fc",
//     padding: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#333",
//     marginBottom: 25,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: "500",
//     marginBottom: 5,
//   },
//   input: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 20,
//     fontSize: 16,
//     backgroundColor: "#fff",
//     color: "#000",
//   },
//   pickerWrapper: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     marginBottom: 20,
//     backgroundColor: "#fff",
//   },
//   picker: {
//     width: "100%",
//   },
//   button: {
//     backgroundColor: "#007bff",
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 10,
//     marginTop: 10,
//     width: "85%",
//     alignItems: "center",
//   },
//   buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
//   status: { marginTop: 20, fontSize: 16, fontWeight: "bold" },
//   text: {
//     fontSize: 14,
//     marginTop: 10,
//     textAlign: "center",
//     color: "#555",
//   },
// });

// import React, { useState, useEffect } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   TextInput,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import * as Location from "expo-location";
// import * as TaskManager from "expo-task-manager";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// // --- Supabase setup ---
// import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// // --- Background location task name ---
// const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// // --- Define TaskManager task ---
// TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
//   if (error) {
//     console.error("Background location error:", error);
//     return;
//   }

//   if (data && data.locations) {
//     try {
//       const savedInfo = await AsyncStorage.getItem("driverInfo");
//       if (!savedInfo) return;

//       const { driverId, busId } = JSON.parse(savedInfo);

//       for (const loc of data.locations) {
//         const payload = {
//           driver_id: driverId,
//           bus_id: busId,
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//           recorded_at: new Date().toISOString(),
//         };

//         console.log("Background location sending:", payload);

//         const { error: insertError } = await supabase
//           .from("driver_locations")
//           .insert([payload]);

//         if (insertError) console.error("Supabase insert error (background):", insertError);
//       }
//     } catch (e) {
//       console.error("Error reading driver info:", e);
//     }
//   }
// });

// export default function App() {
//   const [driverId, setDriverId] = useState("");
//   const [busId, setBusId] = useState(1);
//   const [loggedIn, setLoggedIn] = useState(false);
//   const [tracking, setTracking] = useState(false);
//   const [location, setLocation] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);
//   const [watcher, setWatcher] = useState(null);

//   const buses = [
//     { id: 1, name: "Bus 1" },
//     { id: 2, name: "Bus 2" },
//     { id: 3, name: "Bus 3" },
//   ];

//   // Restore login info on app start
//   useEffect(() => {
//     (async () => {
//       const savedInfo = await AsyncStorage.getItem("driverInfo");
//       if (savedInfo) {
//         const { driverId, busId } = JSON.parse(savedInfo);
//         setDriverId(driverId);
//         setBusId(busId);
//         setLoggedIn(true);
//       }
//     })();
//   }, []);

//   // --- Driver Login ---
//   const handleLogin = async () => {
//     if (!driverId.trim()) {
//       Alert.alert("Error", "Please enter Driver ID");
//       return;
//     }

//     await AsyncStorage.setItem("driverInfo", JSON.stringify({ driverId, busId }));
//     setLoggedIn(true);
//   };

//   // --- Driver Logout ---
//   const handleLogout = async () => {
//     await AsyncStorage.removeItem("driverInfo");
//     setDriverId("");
//     setBusId(1);
//     setLoggedIn(false);
//     setTracking(false);
//     if (watcher) watcher.remove();
//     await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//   };

//   // --- Start / Stop tracking ---
//   const toggleTracking = async () => {
//     if (tracking) {
//       if (watcher) watcher.remove();
//       await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//       setWatcher(null);
//       setTracking(false);
//     } else {
//       const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
//       const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

//       if (fgStatus !== "granted" || bgStatus !== "granted") {
//         Alert.alert("Permission Denied", "Location permissions are required");
//         return;
//       }

//       const w = await Location.watchPositionAsync(
//         {
//           accuracy: Location.Accuracy.Balanced, // ⚡ less battery drain
//           timeInterval: 5000, // every 10 seconds
//           distanceInterval: 20, // every 20 meters
//         },
//         async (loc) => {
//           setLocation(loc.coords);
//           setLastUpdated(new Date());

//           const payload = {
//             driver_id: driverId,
//             bus_id: busId,
//             latitude: loc.coords.latitude,
//             longitude: loc.coords.longitude,
//             recorded_at: new Date().toISOString(),
//           };

//           console.log("Foreground location sending:", payload);

//           const { error } = await supabase.from("driver_locations").insert([payload]);
//           if (error) console.error("Supabase insert error (foreground):", error);
//         }
//       );

//       setWatcher(w);
//       setTracking(true);

//       await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
//         accuracy: Location.Accuracy.Balanced,
//         timeInterval: 5000,
//         distanceInterval: 20,
//         showsBackgroundLocationIndicator: true,
//         foregroundService: {
//           notificationTitle: "Driver Tracking Active",
//           notificationBody: "Your location is being tracked in background",
//         },
//         pausesUpdatesAutomatically: false,
//       });
//     }
//   };

//   // --- Login screen ---
//   if (!loggedIn) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.title}>Driver Login</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter Driver ID"
//           value={driverId}
//           onChangeText={setDriverId}
//           placeholderTextColor="#aaa"
//         />
//         <View style={styles.pickerWrapper}>
//           <Picker selectedValue={busId} onValueChange={setBusId} style={styles.picker}>
//             {buses.map((bus) => (
//               <Picker.Item key={bus.id} label={bus.name} value={bus.id} />
//             ))}
//           </Picker>
//         </View>
//         <TouchableOpacity style={styles.button} onPress={handleLogin}>
//           <Text style={styles.buttonText}>Login</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   // --- Main screen ---
//   const secondsAgo = lastUpdated ? Math.floor((new Date() - lastUpdated) / 1000) : null;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Driver Dashboard</Text>

//       <Text style={styles.text}>Driver: {driverId}</Text>
//       <Text style={styles.text}>
//         Selected Bus: {buses.find((b) => b.id === busId)?.name || "Unknown"}
//       </Text>

//       <TouchableOpacity
//         style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
//         onPress={toggleTracking}
//       >
//         <Text style={styles.buttonText}>
//           {tracking ? "Stop Tracking" : "Start Tracking"}
//         </Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={[styles.button, { backgroundColor: "#6c757d" }]} onPress={handleLogout}>
//         <Text style={styles.buttonText}>Logout</Text>
//       </TouchableOpacity>

//       <Text style={styles.status}>
//         Status: {tracking ? "✅ Tracking Active" : "⚠️ Offline"}
//       </Text>

//       <Text style={styles.text}>
//         {location
//           ? `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
//           : "Waiting for location..."}
//       </Text>

//       <Text style={styles.text}>
//         {secondsAgo !== null
//           ? `Last updated: ${secondsAgo} sec ago`
//           : "Not updated yet"}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f7f9fc",
//     padding: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#333",
//     marginBottom: 25,
//   },
//   input: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 20,
//     fontSize: 16,
//     backgroundColor: "#fff",
//     color: "#000",
//   },
//   pickerWrapper: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     marginBottom: 20,
//     backgroundColor: "#fff",
//   },
//   picker: {
//     width: "100%",
//   },
//   button: {
//     backgroundColor: "#007bff",
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 10,
//     marginTop: 10,
//     width: "85%",
//     alignItems: "center",
//   },
//   buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
//   status: { marginTop: 20, fontSize: 16, fontWeight: "bold" },
//   text: {
//     fontSize: 14,
//     marginTop: 10,
//     textAlign: "center",
//     color: "#555",
//   },
// });












// import React, { useState, useEffect } from "react";
// import {
//   StyleSheet,
//   Text,
//   View,
//   TextInput,
//   TouchableOpacity,
//   Alert,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import * as Location from "expo-location";
// import * as TaskManager from "expo-task-manager";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// // --- Background location task name ---
// const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// // 🟢 global memory cache for background tasks
// let driverCache = { driverId: null, busId: null };

// // --- Define TaskManager task ---
// TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
//   if (error) {
//     console.error("Background location error:", error);
//     return;
//   }

//   if (data && data.locations) {
//     const { driverId, busId } = driverCache; // 🟢 use in-memory cache
//     if (!driverId || !busId) return;

//     for (const loc of data.locations) {
//       const payload = {
//         driver_id: driverId,
//         bus_id: busId,
//         latitude: loc.coords.latitude,
//         longitude: loc.coords.longitude,
//         recorded_at: new Date().toISOString(),
//       };

//       console.log("Background location sending:", payload);

//       const { error: insertError } = await supabase
//         .from("driver_locations")
//         .insert([payload]);

//       if (insertError) console.error("Supabase insert error (background):", insertError);
//     }
//   }
// });

// export default function App() {
//   const [driverId, setDriverId] = useState("");
//   const [busId, setBusId] = useState(1);
//   const [loggedIn, setLoggedIn] = useState(false);
//   const [tracking, setTracking] = useState(false);
//   const [location, setLocation] = useState(null);
//   const [lastUpdated, setLastUpdated] = useState(null);
//   const [watcher, setWatcher] = useState(null);

//   const buses = [
//     { id: 1, name: "Bus 1" },
//     { id: 2, name: "Bus 2" },
//     { id: 3, name: "Bus 3" },
//   ];

//   // Restore login info on app start
//   useEffect(() => {
//     (async () => {
//       const savedInfo = await AsyncStorage.getItem("driverInfo");
//       if (savedInfo) {
//         const { driverId, busId } = JSON.parse(savedInfo);
//         setDriverId(driverId);
//         setBusId(busId);
//         setLoggedIn(true);
//         driverCache = { driverId, busId }; // 🟢 restore into memory
//       }
//     })();
//   }, []);

//   const handleLogin = async () => {
//     if (!driverId.trim()) {
//       Alert.alert("Error", "Please enter Driver ID");
//       return;
//     }
//     await AsyncStorage.setItem("driverInfo", JSON.stringify({ driverId, busId }));
//     driverCache = { driverId, busId }; // 🟢 update memory cache
//     setLoggedIn(true);
//   };

//   const handleLogout = async () => {
//     await AsyncStorage.removeItem("driverInfo");
//     driverCache = { driverId: null, busId: null }; // 🟢 clear cache
//     setDriverId("");
//     setBusId(1);
//     setLoggedIn(false);
//     setTracking(false);
//     if (watcher) watcher.remove();
//     await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//   };

//   const toggleTracking = async () => {
//     if (tracking) {
//       if (watcher) watcher.remove();
//       await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
//       setWatcher(null);
//       setTracking(false);
//     } else {
//       const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
//       const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

//       if (fgStatus !== "granted" || bgStatus !== "granted") {
//         Alert.alert("Permission Denied", "Location permissions are required");
//         return;
//       }

//       // --- Foreground watcher ---
//       const w = await Location.watchPositionAsync(
//         {
//           accuracy: Location.Accuracy.Balanced,
//           timeInterval: 10000,
//           distanceInterval: 20,
//         },
//         async (loc) => {
//           setLocation(loc.coords);
//           setLastUpdated(new Date());

//           const payload = {
//             driver_id: driverId,
//             bus_id: busId,
//             latitude: loc.coords.latitude,
//             longitude: loc.coords.longitude,
//             recorded_at: new Date().toISOString(),
//           };

//           console.log("Foreground location sending:", payload);

//           const { error } = await supabase.from("driver_locations").insert([payload]);
//           if (error) console.error("Supabase insert error (foreground):", error);
//         }
//       );

//       setWatcher(w);
//       setTracking(true);

//       // --- Background updates ---
//       driverCache = { driverId, busId }; // 🟢 ensure background has data
//       const isRegistered = await Location.hasStartedLocationUpdatesAsync(
//         BACKGROUND_LOCATION_TASK
//       );
//       if (!isRegistered) {
//         await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
//           accuracy: Location.Accuracy.Balanced,
//           timeInterval: 10000,
//           distanceInterval: 20,
//           showsBackgroundLocationIndicator: true,
//           foregroundService: {
//             notificationTitle: "Driver Tracking Active",
//             notificationBody: "Your location is being tracked in background",
//           },
//           pausesUpdatesAutomatically: false,
//         });
//       }
//     }
//   };

//   if (!loggedIn) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.title}>Driver Login</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter Driver ID"
//           value={driverId}
//           onChangeText={setDriverId}
//           placeholderTextColor="#aaa"
//         />
//         <View style={styles.pickerWrapper}>
//           <Picker selectedValue={busId} onValueChange={setBusId} style={styles.picker}>
//             {buses.map((bus) => (
//               <Picker.Item key={bus.id} label={bus.name} value={bus.id} />
//             ))}
//           </Picker>
//         </View>
//         <TouchableOpacity style={styles.button} onPress={handleLogin}>
//           <Text style={styles.buttonText}>Login</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   const secondsAgo = lastUpdated ? Math.floor((new Date() - lastUpdated) / 1000) : null;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Driver Dashboard</Text>

//       <Text style={styles.text}>Driver: {driverId}</Text>
//       <Text style={styles.text}>
//         Selected Bus: {buses.find((b) => b.id === busId)?.name || "Unknown"}
//       </Text>

//       <TouchableOpacity
//         style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
//         onPress={toggleTracking}
//       >
//         <Text style={styles.buttonText}>
//           {tracking ? "Stop Tracking" : "Start Tracking"}
//         </Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={[styles.button, { backgroundColor: "#6c757d" }]} onPress={handleLogout}>
//         <Text style={styles.buttonText}>Logout</Text>
//       </TouchableOpacity>

//       <Text style={styles.status}>
//         Status: {tracking ? "✅ Tracking Active" : "⚠️ Offline"}
//       </Text>

//       <Text style={styles.text}>
//         {location
//           ? `Latitude: ${location.latitude}\nLongitude: ${location.longitude}`
//           : "Waiting for location..."}
//       </Text>

//       <Text style={styles.text}>
//         {secondsAgo !== null
//           ? `Last updated: ${secondsAgo} sec ago`
//           : "Not updated yet"}
//       </Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f7f9fc",
//     padding: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#333",
//     marginBottom: 25,
//   },
//   input: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 20,
//     fontSize: 16,
//     backgroundColor: "#fff",
//     color: "#000",
//   },
//   pickerWrapper: {
//     width: "85%",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     marginBottom: 20,
//     backgroundColor: "#fff",
//   },
//   picker: {
//     width: "100%",
//   },
//   button: {
//     backgroundColor: "#007bff",
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 10,
//     marginTop: 10,
//     width: "85%",
//     alignItems: "center",
//   },
//   buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
//   status: { marginTop: 20, fontSize: 16, fontWeight: "bold" },
//   text: {
//     fontSize: 14,
//     marginTop: 10,
//     textAlign: "center",
//     color: "#555",
//   },
// });










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
      if (insertError) console.error("Supabase background insert error:", insertError);
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
  const foregroundWatcher = useRef(null); // 🟢 useRef for watcher
  const appState = useRef(AppState.currentState);

  const buses = [
    { id: 1, name: "Bus 1" },
    { id: 2, name: "Bus 2" },
    { id: 3, name: "Bus 3" },
  ];

  // --- AppState listener to start/stop background tracking ---
  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [tracking]);

  const handleAppStateChange = async (nextAppState) => {
    if (!tracking) return;

    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      console.log("App went to background → start background tracking");
      await startBackgroundTracking();
    } else if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      console.log("App came to foreground → stop background tracking");
      await stopBackgroundTracking();
    }

    appState.current = nextAppState;
  };

  // --- Login / Logout ---
  const handleLogin = () => {
    if (!driverId.trim()) {
      Alert.alert("Error", "Please enter Driver ID");
      return;
    }
    driverCache = { driverId, busId }; // 🟢 update global cache
    setLoggedIn(true);
  };

  const handleLogout = async () => {
    await stopTracking();
    driverCache = { driverId: null, busId: null };
    setDriverId("");
    setBusId(1);
    setLoggedIn(false);
  };

  // --- Foreground Tracking ---
  const startForegroundTracking = async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") {
      Alert.alert("Permission Denied", "Foreground location permission required");
      return;
    }

    if (foregroundWatcher.current) return; // already tracking

    foregroundWatcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval:0,
      },
      async (loc) => {
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
        const { error } = await supabase.from("driver_locations").insert([payload]);
        if (error) console.error("Supabase foreground insert error:", error);
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
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      Alert.alert("Permission Denied", "Background location permission required");
      return;
    }

    const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
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
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
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
          <Picker selectedValue={busId} onValueChange={setBusId} style={styles.picker}>
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

  const secondsAgo = lastUpdated ? Math.floor((new Date() - lastUpdated) / 1000) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Dashboard</Text>
      <Text style={styles.text}>Driver: {driverId}</Text>
      <Text style={styles.text}>Bus: {buses.find((b) => b.id === busId)?.name || "Unknown"}</Text>

      <TouchableOpacity
        style={[styles.button, tracking && { backgroundColor: "#d9534f" }]}
        onPress={tracking ? stopTracking : startTracking}
      >
        <Text style={styles.buttonText}>{tracking ? "Stop Tracking" : "Start Tracking"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: "#6c757d" }]} onPress={handleLogout}>
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
        {secondsAgo !== null ? `Last updated: ${secondsAgo} sec ago` : "Not updated yet"}
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
