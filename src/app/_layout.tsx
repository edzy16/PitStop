import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { SQLiteProvider } from "expo-sqlite";
import React, { useState } from "react";

import { AddSheet } from "@/components/add-sheet";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { FAB } from "@/components/fab";
import { migrateDb } from "@/db/migrations";

export default function TabLayout() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <SQLiteProvider databaseName="logleaf.db" onInit={migrateDb}>
      <ThemeProvider value={DarkTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <FAB onPress={() => setAddOpen(true)} />
        <AddSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
