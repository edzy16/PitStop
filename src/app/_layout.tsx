import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { SQLiteProvider } from "expo-sqlite";
import React from "react";
import { StyleSheet, View } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { migrateDb } from "@/db/migrations";

export default function TabLayout() {
  return (
    <SQLiteProvider databaseName="pitstop.db" onInit={migrateDb}>
      <ThemeProvider value={DarkTheme}>
        <View style={styles.container}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </View>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
