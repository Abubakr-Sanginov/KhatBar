import React, { useEffect, useMemo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";
import { useAuthStore } from "../stores/auth-store";
import { useThemeStore } from "../stores/theme-store";
import { useThemeColors } from "../hooks/use-theme";
import type { ThemeColors } from "../theme/colors";

import LoginScreen from "../screens/auth/login-screen";
import RegisterScreen from "../screens/auth/register-screen";
import UsernameScreen from "../screens/auth/username-screen";
import ChatListScreen from "../screens/chat/chat-list-screen";
import ChatScreen from "../screens/chat/chat-screen";
import NewChatScreen from "../screens/chat/new-chat-screen";
import NewGroupScreen from "../screens/chat/new-group-screen";
import CallScreen from "../screens/call/call-screen";
import SettingsScreen from "../screens/settings/settings-screen";
import ProfileScreen from "../screens/settings/profile-screen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

/** Header chrome shared by every pushed screen, in the active palette. */
function headerOptions(colors: ThemeColors, title: string) {
  return {
    headerShown: true,
    headerTitle: title,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text },
  };
}

function ChatStackNavigator() {
  const colors = useThemeColors();
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }: any) => headerOptions(colors, route.params?.chatName || "Chat")}
      />
      <ChatStack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={headerOptions(colors, "New Chat")}
      />
      <ChatStack.Screen
        name="NewGroup"
        component={NewGroupScreen}
        options={headerOptions(colors, "New Group")}
      />
    </ChatStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const colors = useThemeColors();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={headerOptions(colors, "Edit Profile")}
      />
    </SettingsStack.Navigator>
  );
}

function MainTabs() {
  const colors = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatStackNavigator}
        options={{
          tabBarLabel: "Chats",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Text style={{ fontSize: size || 22, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Text style={{ fontSize: size || 22, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  const colors = useThemeColors();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user, checkSession } = useAuthStore();
  const colors = useThemeColors();
  const mode = useThemeStore((s) => s.mode);
  const isThemeHydrated = useThemeStore((s) => s.isHydrated);

  useEffect(() => {
    checkSession();
  }, []);

  const navigationTheme = useMemo(
    () => ({
      dark: mode === "dark",
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
        regular: colors.text,
      },
    }),
    [colors, mode]
  );

  // Wait for the stored interface too, so the first frame is not repainted.
  if (isLoading || !isThemeHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !user?.username ? (
          <Stack.Screen
            name="Username"
            component={UsernameScreen}
            options={{ animation: "fade" }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ animation: "slide_from_bottom" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
