import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useApp } from './AppContext';
import { PoolInfo } from '@tuxnotas/shared';
import * as FileSystem from 'expo-file-system/legacy';
import * as Y from 'yjs';
import { TaskService, TaskList, Task } from '@tuxnotas/shared';
import { Buffer } from 'buffer';

interface TaskWidgetProps {
    pools: PoolInfo[];
}

export default function TaskWidget({ pools }: TaskWidgetProps) {
    const { settings, updateSettings } = useApp();
    const sf = settings.fontSizeMultiplier;
    const config = settings.dashboardWidget;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [configModal, setConfigModal] = useState(false);

    // Config states
    const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
    const [poolLists, setPoolLists] = useState<TaskList[]>([]);

    useEffect(() => {
        if (!config?.poolId || !config?.listId) return;

        const loadWidgetTasks = async () => {
            try {
                const path = FileSystem.documentDirectory + `pool-${config.poolId}.bin`;
                const info = await FileSystem.getInfoAsync(path);
                if (!info.exists) return;

                const base64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
                const doc = new Y.Doc();
                const update = new Uint8Array(Buffer.from(base64, 'base64'));
                Y.applyUpdate(doc, update);

                const service = new TaskService(doc);
                let listTasks = service.getTasks(config.listId as string);

                // Keep only pending
                listTasks = listTasks.filter(t => t.state !== 'done');
                listTasks.sort((a, b) => b.createdAt - a.createdAt);

                setTasks(listTasks.slice(0, 5)); // Show max 5 tasks
            } catch (error) {
                console.log('Error loading widget data', error);
            }
        };

        loadWidgetTasks();
    }, [config]);

    const handleSelectPool = async (poolId: string) => {
        setSelectedPoolId(poolId);
        try {
            const path = FileSystem.documentDirectory + `pool-${poolId}.bin`;
            const info = await FileSystem.getInfoAsync(path);
            if (info.exists) {
                const base64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
                const doc = new Y.Doc();
                const update = new Uint8Array(Buffer.from(base64, 'base64'));
                Y.applyUpdate(doc, update);
                const service = new TaskService(doc);
                setPoolLists(service.getTaskLists(poolId));
            } else {
                setPoolLists([]);
            }
        } catch (e) { setPoolLists([]); }
    };

    const handleSelectList = (listId: string) => {
        updateSettings({ dashboardWidget: { poolId: selectedPoolId as string, listId } });
        setConfigModal(false);
    };

    return (
        <View style={[styles.container, { padding: 16 * sf }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#fff', fontSize: 16 * sf, fontWeight: 'bold' }}>Tareas Destacadas</Text>
                <TouchableOpacity onPress={() => { setSelectedPoolId(null); setConfigModal(true); }}>
                    <Text style={{ color: '#aaa', fontSize: 12 * sf }}>Configurar</Text>
                </TouchableOpacity>
            </View>

            {!config?.poolId ? (
                <View style={styles.emptyBox}>
                    <Text style={{ color: '#666', fontSize: 14 * sf, textAlign: 'center' }}>Selecciona una lista de tareas para monitorear desde aquí.</Text>
                </View>
            ) : tasks.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={{ color: '#666', fontSize: 14 * sf, textAlign: 'center' }}>¡Felicidades! No hay tareas pendientes aquí.</Text>
                </View>
            ) : (
                <View style={{ gap: 8 }}>
                    {tasks.map(t => (
                        <View key={t.id} style={styles.taskItem}>
                            <View style={[styles.dot, { width: 8 * sf, height: 8 * sf, borderRadius: 4 * sf }]} />
                            <Text style={{ color: '#eee', fontSize: 14 * sf }} numberOfLines={2}>{t.text}</Text>
                        </View>
                    ))}
                    {tasks.length === 5 && <Text style={{ color: '#666', fontSize: 12 * sf, marginTop: 4 }}>+ Más tareas en la lista</Text>}
                </View>
            )}

            {/* Widget Config Modal */}
            {configModal && (
                <Modal visible transparent animationType="slide">
                    <View style={StyleSheet.absoluteFill}>
                        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setConfigModal(false)} />
                        <View style={styles.modalContent}>
                            <Text style={{ color: '#fff', fontSize: 18 * sf, fontWeight: 'bold', marginBottom: 16 }}>Configurar Widget</Text>

                            {!selectedPoolId ? (
                                <>
                                    <Text style={{ color: '#aaa', fontSize: 14 * sf, marginBottom: 16 }}>Paso 1: Selecciona un espacio</Text>
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {pools.map(p => (
                                            <TouchableOpacity key={p.id} style={styles.modalOption} onPress={() => handleSelectPool(p.id)}>
                                                <Text style={{ color: '#fff', fontSize: 16 * sf }}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            ) : (
                                <>
                                    <Text style={{ color: '#aaa', fontSize: 14 * sf, marginBottom: 16 }}>Paso 2: Selecciona la lista a mostrar</Text>
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {poolLists.length === 0 && <Text style={{ color: '#fff', textAlign: 'center' }}>No hay listas cerradas/guardadas.</Text>}
                                        {poolLists.map(l => (
                                            <TouchableOpacity key={l.id} style={styles.modalOption} onPress={() => handleSelectList(l.id)}>
                                                <Text style={{ color: '#fff', fontSize: 16 * sf }}>{l.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setSelectedPoolId(null)}>
                                        <Text style={{ color: '#aaa', textAlign: 'center' }}>← Volver a pasos</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#1a1a1a', borderRadius: 16, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
    emptyBox: { backgroundColor: '#222', borderRadius: 12, padding: 20, alignItems: 'center' },
    taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', padding: 12, borderRadius: 12 },
    dot: { backgroundColor: '#4CAF50', marginRight: 12 },

    modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, position: 'absolute', bottom: 0, left: 0, right: 0 },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' }
});
