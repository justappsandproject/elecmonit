import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const API_URL = "http://localhost:4000";
const ELECTION_TYPES = [
  "PRESIDENTIAL",
  "GOVERNORSHIP",
  "SENATE",
  "HOUSE_OF_REPRESENTATIVES",
  "STATE_HOUSE_OF_ASSEMBLY"
];

export default function App() {
  const [agentName, setAgentName] = useState("");
  const [stateName, setStateName] = useState("");
  const [ward, setWard] = useState("");
  const [localGovernment, setLocalGovernment] = useState("");
  const [pollingUnitCode, setPollingUnitCode] = useState("");
  const [electionType, setElectionType] = useState(ELECTION_TYPES[0]);
  const [electionCycle, setElectionCycle] = useState("2027 General Election");
  const [imagePayload, setImagePayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return agentName && stateName && ward && localGovernment && pollingUnitCode && imagePayload?.base64;
  }, [agentName, stateName, ward, localGovernment, pollingUnitCode, imagePayload]);

  async function requestCameraPermission() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Camera permission is needed to snap result sheets.");
      return false;
    }
    return true;
  }

  async function pickFromCamera() {
    const granted = await requestCameraPermission();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert("Image error", "Could not extract image data from captured photo.");
      return;
    }

    setImagePayload({
      base64: asset.base64,
      uri: asset.uri,
      mediaType: asset.mimeType || "image/jpeg"
    });
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert("Image error", "Could not extract image data from selected image.");
      return;
    }

    setImagePayload({
      base64: asset.base64,
      uri: asset.uri,
      mediaType: asset.mimeType || "image/jpeg"
    });
  }

  async function submitSheet() {
    if (!canSubmit) {
      Alert.alert("Missing fields", "Please fill all fields and capture/select a result sheet image.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentName,
          state: stateName,
          ward,
          localGovernment,
          pollingUnitCode,
          electionType,
          electionCycle,
          imageBase64: imagePayload.base64,
          mediaType: imagePayload.mediaType,
          imagePreview: imagePayload.uri
        })
      });

      if (!response.ok) {
        throw new Error("Failed to submit result sheet");
      }

      setImagePayload(null);
      Alert.alert("Uploaded", "Result sheet transmitted to e-situation room.");
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Field Agent App</Text>
        <Text style={styles.subtitle}>Capture and transmit polling-unit results</Text>

        <TextInput
          style={styles.input}
          placeholder="Agent Name"
          placeholderTextColor="#94a3b8"
          value={agentName}
          onChangeText={setAgentName}
        />
        <TextInput
          style={styles.input}
          placeholder="State"
          placeholderTextColor="#94a3b8"
          value={stateName}
          onChangeText={setStateName}
        />
        <TextInput
          style={styles.input}
          placeholder="Ward"
          placeholderTextColor="#94a3b8"
          value={ward}
          onChangeText={setWard}
        />
        <TextInput
          style={styles.input}
          placeholder="Polling Unit Code"
          placeholderTextColor="#94a3b8"
          value={pollingUnitCode}
          onChangeText={setPollingUnitCode}
        />
        <TextInput
          style={styles.input}
          placeholder="Local Government Area"
          placeholderTextColor="#94a3b8"
          value={localGovernment}
          onChangeText={setLocalGovernment}
        />
        <TextInput
          style={styles.input}
          placeholder="Election Cycle"
          placeholderTextColor="#94a3b8"
          value={electionCycle}
          onChangeText={setElectionCycle}
        />

        <Text style={styles.sectionTitle}>Election Type</Text>
        <View style={styles.typeGrid}>
          {ELECTION_TYPES.map((type) => {
            const active = type === electionType;
            return (
              <Pressable key={type} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setElectionType(type)}>
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type.replaceAll("_", " ")}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.captureRow}>
          <Pressable style={styles.secondaryButton} onPress={pickFromCamera}>
            <Text style={styles.secondaryButtonText}>Snap Sheet</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={pickFromGallery}>
            <Text style={styles.secondaryButtonText}>Upload From Gallery</Text>
          </Pressable>
        </View>

        {imagePayload?.uri && (
          <Image source={{ uri: imagePayload.uri }} style={styles.preview} />
        )}

        <Pressable style={[styles.button, !canSubmit && styles.disabled]} onPress={submitSheet} disabled={!canSubmit || submitting}>
          <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Transmit Result Sheet"}</Text>
        </Pressable>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Production note</Text>
          <Text style={styles.note}>
            Set API_URL to your machine IP when testing on real devices
            (for example, http://192.168.1.10:4000 instead of localhost).
          </Text>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617"
  },
  container: {
    padding: 18,
    gap: 12
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#94a3b8",
    marginBottom: 10
  },
  sectionTitle: {
    color: "#cbd5e1",
    fontWeight: "600",
    marginTop: 4
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    color: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    fontWeight: "600",
    fontSize: 12
  },
  captureRow: {
    flexDirection: "row",
    gap: 10
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  typeChip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#0b1220"
  },
  typeChipActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8"
  },
  typeChipText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600"
  },
  typeChipTextActive: {
    color: "#fff"
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    borderColor: "#1e293b",
    borderWidth: 1
  },
  disabled: {
    opacity: 0.5
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  noteBox: {
    marginTop: 8,
    backgroundColor: "#0b1220",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12
  },
  noteTitle: {
    color: "#f8fafc",
    fontWeight: "700",
    marginBottom: 6
  },
  note: {
    color: "#cbd5e1",
    lineHeight: 20
  }
});
