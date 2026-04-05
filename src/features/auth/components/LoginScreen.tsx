import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const LoginScreen = () => {
  const [username, setUsername] = useState('testuser');
  const [password, setPassword] = useState('password');
  const login = useAuthStore(state => state.login);
  const isAuthLoading = useAuthStore(state => state.isAuthLoading);

  const handleLogin = async () => {
    try {
      await login(username, password);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PulseBoard</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
      />
      <Button
        title={isAuthLoading ? 'Logging in...' : 'Log In'}
        onPress={handleLogin}
        disabled={isAuthLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#F9FAFB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    color: '#F9FAFB',
    backgroundColor: '#1F2937',
  },
});
