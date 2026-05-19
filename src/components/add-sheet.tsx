import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Colors, Spacing } from '@/constants/theme';
import { Vehicle, Part } from '@/types';
import { getVehicles } from '@/db/vehicles';
import { getPartsByVehicle } from '@/db/parts';
import { ModalSheet } from './modal-sheet';
import { LogReplacementModal } from './modals/log-replacement-modal';
import { LogFuelModal } from './modals/log-fuel-modal';
import { AddVehicleModal } from './modals/add-vehicle-modal';
import { AddPartModal } from './modals/add-part-modal';
import { ThemedText } from './themed-text';

type AddAction = 'replacement' | 'fuel' | 'add-vehicle' | null;

interface AddSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddSheet({ visible, onClose, onSaved }: AddSheetProps) {
  const db = useSQLiteContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [action, setAction] = useState<AddAction>(null);
  const [addPartOpen, setAddPartOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      getVehicles(db).then(setVehicles);
      setSelectedVehicle(null);
      setParts([]);
      setSelectedPart(null);
      setAction(null);
      setAddPartOpen(false);
    }
  }, [visible, db]);

  async function handleVehicleSelect(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    if (action === 'replacement') {
      const p = await getPartsByVehicle(db, vehicle.id);
      setParts(p);
    }
  }

  function resetSteps() {
    setSelectedVehicle(null);
    setParts([]);
    setSelectedPart(null);
    setAction(null);
    setAddPartOpen(false);
  }

  function handleCancel() {
    resetSteps();
    onClose();
  }

  function handleSaved() {
    onSaved();
    resetSteps();
    onClose();
  }

  // Step 1: Action picker
  if (action === null) {
    return (
      <ModalSheet visible={visible} onClose={handleCancel}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          Add / Log
        </ThemedText>
        <View style={styles.rowList}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setAction('add-vehicle')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="directions-car" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Add Vehicle</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Add a new vehicle to track
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setAction('replacement')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="auto-fix-high" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Part Replacement</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Reset maintenance interval
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setAction('fuel')}>
            <View style={styles.iconTile}>
              <MaterialIcons name="local-gas-station" size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.actionRowContent}>
              <ThemedText type="default" style={styles.rowTitle}>Log Fuel Fill-up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Track mileage and cost
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </ModalSheet>
    );
  }

  // Add vehicle has no vehicle-selection step
  if (action === 'add-vehicle') {
    return (
      <AddVehicleModal
        visible={visible}
        onClose={handleCancel}
        onSaved={handleSaved}
      />
    );
  }

  // Step 2: Vehicle picker (for replacement, fuel)
  if (!selectedVehicle) {
    return (
      <ModalSheet visible={visible} onClose={handleCancel}>
        <ThemedText type="subtitle" style={styles.titleCenter}>
          Select Vehicle
        </ThemedText>
        {vehicles.length === 0 && (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No vehicles yet. Add one first.
          </ThemedText>
        )}
        <View style={styles.rowList}>
          {vehicles.map(v => (
            <TouchableOpacity
              key={v.id}
              style={styles.simpleRow}
              onPress={() => handleVehicleSelect(v)}>
              <View style={styles.simpleRowContent}>
                <ThemedText type="default" style={styles.rowTitle}>{v.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {v.current_km.toLocaleString()} km
                </ThemedText>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </TouchableOpacity>
      </ModalSheet>
    );
  }

  async function handlePartAdded() {
    const p = await getPartsByVehicle(db, selectedVehicle!.id);
    setParts(p);
    setAddPartOpen(false);
  }

  return (
    <>
      {action === 'replacement' && (
        <ModalSheet visible={visible} onClose={handleCancel}>
          <View style={styles.partListHeader}>
            <ThemedText type="subtitle" style={[styles.titleCenter, { marginBottom: 0 }]}>
              Select Part
            </ThemedText>
            <TouchableOpacity style={styles.addPartLink} onPress={() => setAddPartOpen(true)}>
              <MaterialIcons name="add" size={18} color={Colors.dark.primary} />
              <ThemedText themeColor="primary">Add Part</ThemedText>
            </TouchableOpacity>
          </View>
          {parts.length === 0 && (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No parts for this vehicle yet.
            </ThemedText>
          )}
          <View style={styles.rowList}>
            {parts.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.simpleRow}
                onPress={() => setSelectedPart(p)}>
                <ThemedText type="default" style={styles.rowTitle}>{p.name}</ThemedText>
                <MaterialIcons name="chevron-right" size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          {addPartOpen && (
            <AddPartModal
              visible
              onClose={() => setAddPartOpen(false)}
              onSaved={handlePartAdded}
              vehicleId={selectedVehicle.id}
              currentKm={selectedVehicle.current_km}
            />
          )}
          {selectedPart && (
            <LogReplacementModal
              visible
              onClose={() => setSelectedPart(null)}
              onSaved={handleSaved}
              part={selectedPart}
              vehicleId={selectedVehicle.id}
              currentKm={selectedVehicle.current_km}
            />
          )}
        </ModalSheet>
      )}

      {action === 'fuel' && (
        <LogFuelModal
          visible={visible}
          onClose={handleCancel}
          onSaved={handleSaved}
          vehicleId={selectedVehicle.id}
          currentKm={selectedVehicle.current_km}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  titleCenter: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  partListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  addPartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  rowList: {
    gap: Spacing.two,
  },
  simpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  simpleRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: Colors.dark.backgroundElevated,
  },
  actionRowContent: {
    flex: 1,
    gap: Spacing.half,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: {
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  cancelText: {
    color: Colors.dark.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
});
