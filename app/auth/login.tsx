import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { login } from "../../AuthService";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const user = await login(email, password);
      console.log("Logged in:", user.email);
      router.replace("/(tabs)"); // Go to camera tabs after login
    } catch (error: any) {
      console.log("Login error:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title="Login" onPress={handleLogin} />

      <View style={{ marginTop: 15 }}>
        <Button title="Go to Signup" onPress={() => router.push("/auth/signup")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 20 
  },
  title: {
     fontSize: 24, 
     marginBottom: 20, 
     textAlign: "center" 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
});
