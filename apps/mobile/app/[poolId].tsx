import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Task, TaskList, TaskService } from '@tuxnotas/shared';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { Awareness } from 'y-protocols/awareness';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../src/AppContext';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { Ionicons } from '@expo/vector-icons';

export default function PoolDetail() {
    const { poolId, name, signalingUrl } = useLocalSearchParams();
    const router = useRouter();
    const { settings } = useApp();
    const sf = settings.fontSizeMultiplier;
    const bf = settings.buttonSizeMultiplier || 1;

    const [doc] = useState(() => new Y.Doc());
    const [taskService] = useState(() => new TaskService(doc));
    const [provider, setProvider] = useState<WebrtcProvider | null>(null);

    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const [newTaskText, setNewTaskText] = useState('');
    const [newListName, setNewListName] = useState('');
    const [creatingList, setCreatingList] = useState(false);
    const [focusedTask, setFocusedTask] = useState<Task | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'pending' | 'done'>('all');
    const [filterModal, setFilterModal] = useState(false);
    const [inputHeight, setInputHeight] = useState(40);

    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!poolId) return;

        let active = true;
        const provMap: any = { current: null };

        const loadAndConnect = async () => {
            // @ts-ignore
            const path = FileSystem.documentDirectory + `pool-${poolId}.bin`;
            try {
                const info = await FileSystem.getInfoAsync(path);
                if (info.exists) {
                    // @ts-ignore
                    const base64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
                    const update = new Uint8Array(Buffer.from(base64, 'base64'));
                    Y.applyUpdate(doc, update);
                }
            } catch (e) { console.error('Error loading YDoc:', e); }

            if (!active) return;

            const url = signalingUrl as string || 'ws://localhost:4444';
            console.log('Connecting to', url);
            const prov = new WebrtcProvider(poolId as string, doc, {
                signaling: [url],
                password: undefined,
                awareness: new Awareness(doc),
                maxConns: 20 + Math.floor(Math.random() * 15),
                filterBcConns: false,
                peerOpts: {}
            });
            provMap.current = prov;
            setProvider(prov);
            setTick(t => t + 1); // Render after load
        };

        loadAndConnect();

        const updateHandler = () => {
            setTick(t => t + 1);
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(async () => {
                // @ts-ignore
                const path = FileSystem.documentDirectory + `pool-${poolId}.bin`;
                const state = Y.encodeStateAsUpdate(doc);
                // @ts-ignore
                await FileSystem.writeAsStringAsync(path, Buffer.from(state).toString('base64'), { encoding: FileSystem.EncodingType.Base64 }).catch(() => { });
            }, 1000);
        };
        doc.on('update', updateHandler);

        return () => {
            active = false;
            if (provMap.current) provMap.current.destroy();
            doc.off('update', updateHandler);
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [poolId, signalingUrl, doc]);

    const taskLists = taskService.getTaskLists(poolId as string);
    let tasks = activeListId ? taskService.getTasks(activeListId) : [];

    if (filterType === 'pending') tasks = tasks.filter(t => t.state !== 'done');
    if (filterType === 'done') tasks = tasks.filter(t => t.state === 'done');
    // Sort logic so that done are usually at the bottom or sorted normally by creation/due
    tasks.sort((a, b) => b.createdAt - a.createdAt);

    useEffect(() => {
        if (!activeListId && taskLists.length > 0) {
            setActiveListId(taskLists[0].id);
        }
    }, [activeListId, taskLists]);

    const handleAddTask = () => {
        if (!newTaskText.trim() || !activeListId) return;
        taskService.addTask(activeListId, newTaskText.trim());
        setNewTaskText('');
    };

    const handleToggleTask = (task: Task) => {
        const newState = task.state === 'done' ? 'pending' : 'done';
        taskService.updateTask(task.id, { state: newState });
    };

    const handleCreateList = () => {
        if (!newListName.trim()) return;
        const list = taskService.createTaskList(newListName.trim(), poolId as string);
        setNewListName('');
        setCreatingList(false);
        setActiveListId(list.id);
    };

    const saveFocusedTask = () => {
        if (focusedTask) {
            taskService.updateTask(focusedTask.id, { description: focusedTask.description, dueDate: focusedTask.dueDate });
            setFocusedTask(null);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                <Stack.Screen options={{ title: name as string || 'Espacio', headerStyle: { backgroundColor: '#111' }, headerTintColor: '#fff', headerTitleStyle: { fontSize: 18 * sf } }} />
                <StatusBar style="light" />

                {/* List Selector */}
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', alignItems: 'center' }}>
                    <ScrollView horizontal contentContainerStyle={{ padding: 8 * bf, gap: 8 * bf }} style={{ flex: 1 }}>
                        {taskLists.map(list => (
                            <TouchableOpacity
                                key={list.id}
                                style={[styles.tab, { paddingVertical: 6 * bf, paddingHorizontal: 12 * bf }, activeListId === list.id && styles.activeTab]}
                                onPress={() => setActiveListId(list.id)}>
                                <Text style={[styles.tabText, { fontSize: 13 * sf }, activeListId === list.id && styles.activeTabText]}>{list.name}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.tab, { paddingVertical: 6 * bf, paddingHorizontal: 12 * bf }]} onPress={() => setCreatingList(true)}>
                            <Text style={[styles.tabText, { fontSize: 13 * sf }]}>+ Nueva lista</Text>
                        </TouchableOpacity>
                    </ScrollView>
                    <TouchableOpacity onPress={() => setFilterModal(true)} style={{ padding: 12 * bf }}>
                        <Ionicons name="filter-outline" size={24 * sf} color={filterType !== 'all' ? '#4CAF50' : '#ccc'} />
                    </TouchableOpacity>
                </View>

                {creatingList && (
                    <View style={[styles.creationBar, { padding: 10 * sf }]}>
                        <TextInput style={[styles.input, { fontSize: 14 * sf }]} placeholder="Nombre de lista..." placeholderTextColor="#666" value={newListName} onChangeText={setNewListName} autoFocus onSubmitEditing={handleCreateList} />
                        <TouchableOpacity onPress={handleCreateList} style={{ padding: 8 * bf, paddingHorizontal: 16 * bf }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 * sf }}>OK</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setCreatingList(false)} style={{ padding: 8 * bf }}><Text style={{ color: '#aaa', fontSize: 14 * sf }}>X</Text></TouchableOpacity>
                    </View>
                )}

                {/* Tasks */}
                <View style={{ flex: 1, padding: 16 * sf }}>
                    {!activeListId ? (
                        <View style={styles.center}><Text style={{ color: '#666', fontSize: 14 * sf }}>Selecciona o crea una lista de tareas</Text></View>
                    ) : (
                        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                            {tasks.length === 0 && <Text style={{ color: '#444', textAlign: 'center', marginTop: 20 * sf, fontSize: 14 * sf }}>No hay tareas</Text>}
                            {tasks.map(task => (
                                <TouchableOpacity key={task.id} style={styles.taskItem} onPress={() => handleToggleTask(task)} onLongPress={() => setFocusedTask(task)}>
                                    <View style={[styles.checkbox, { width: 20 * sf, height: 20 * sf, borderRadius: 10 * sf }, task.state === 'done' && styles.checkboxChecked]}>
                                        {task.state === 'done' && <Text style={{ color: '#000', fontSize: 10 * sf }}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.taskText, { fontSize: 16 * sf }, task.state === 'done' && styles.taskTextDone]}>{task.text}</Text>
                                        {task.description && (
                                            <Text style={{ color: '#888', fontSize: 12 * sf, marginTop: 4 }}>{task.description}</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Task input field */}
                {activeListId && (
                    <View style={[styles.footer, { padding: 12 * sf }]}>
                        <TextInput
                            placeholder="Escribe una tarea..."
                            placeholderTextColor="#666"
                            value={newTaskText}
                            onChangeText={setNewTaskText}
                            multiline={true}
                            textAlignVertical="top"
                            onContentSizeChange={e => setInputHeight(e.nativeEvent.contentSize.height)}
                            scrollEnabled={inputHeight > 100 * sf}
                            returnKeyType={Platform.OS === 'ios' ? 'default' : 'done'}
                            blurOnSubmit={false}
                            onSubmitEditing={() => {
                                if (!newTaskText.trim()) return;
                                handleAddTask();
                            }}
                            style={[styles.taskInput, { flex: 1, minHeight: 40 * sf, height: Math.min(Math.max(40 * sf, inputHeight), 100 * sf), backgroundColor: '#222', borderRadius: 20 * sf, paddingHorizontal: 16 * sf, paddingVertical: 10 * sf, color: '#fff', fontSize: 14 * sf }]}
                        />
                        <TouchableOpacity style={{ paddingLeft: 8 * bf, justifyContent: 'center', alignItems: 'center' }} onPress={handleAddTask}>
                            <Ionicons name="checkmark-circle" size={40 * bf} color="#4CAF50" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Filter Modal */}
                {filterModal && (
                    <Modal visible={true} transparent animationType="fade">
                        <View style={StyleSheet.absoluteFill}>
                            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setFilterModal(false)} />
                            <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                                <Text style={{ color: '#fff', fontSize: 18 * sf, fontWeight: 'bold', marginBottom: 16 }}>Filtrar tareas</Text>

                                <TouchableOpacity style={[styles.filterOption, filterType === 'all' && styles.filterOptionActive]} onPress={() => { setFilterType('all'); setFilterModal(false); }}>
                                    <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive, { fontSize: 16 * sf }]}>Todas las tareas</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterOption, filterType === 'pending' && styles.filterOptionActive]} onPress={() => { setFilterType('pending'); setFilterModal(false); }}>
                                    <Text style={[styles.filterText, filterType === 'pending' && styles.filterTextActive, { fontSize: 16 * sf }]}>Solo pendientes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterOption, filterType === 'done' && styles.filterOptionActive]} onPress={() => { setFilterType('done'); setFilterModal(false); }}>
                                    <Text style={[styles.filterText, filterType === 'done' && styles.filterTextActive, { fontSize: 16 * sf }]}>Solo terminadas</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )}

                {/* Task Detail Modal */}
                {focusedTask && (
                    <Modal visible={true} transparent animationType="slide">
                        <View style={StyleSheet.absoluteFill}>
                            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setFocusedTask(null)} activeOpacity={1} />

                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} style={{ justifyContent: 'flex-end' }}>
                                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
                                    <View style={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                                        <Text style={{ color: '#fff', fontSize: 18 * sf, fontWeight: 'bold', marginBottom: 16 }}>{focusedTask.text}</Text>
                                        <TextInput
                                            style={{ backgroundColor: '#222', color: '#fff', padding: 12 * sf, borderRadius: 12, minHeight: 100 * sf, textAlignVertical: 'top', fontSize: 14 * sf, marginBottom: 12 }}
                                            placeholder="Añadir descripción o notas detalladas..."
                                            placeholderTextColor="#666"
                                            multiline
                                            defaultValue={focusedTask.description || ''}
                                            onChangeText={text => focusedTask.description = text}
                                        />

                                        <Text style={{ color: '#aaa', fontSize: 12 * sf, marginBottom: 4 }}>Fecha límite (Día / Mes / Año)</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TextInput
                                                style={{ flex: 1, backgroundColor: '#222', color: '#fff', padding: 12 * sf, borderRadius: 12, fontSize: 14 * sf, textAlign: 'center' }}
                                                placeholder="DD"
                                                placeholderTextColor="#666"
                                                keyboardType="numeric"
                                                maxLength={2}
                                                defaultValue={focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-')[2] : ''}
                                                onChangeText={text => {
                                                    let [y, m, d] = focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-') : [new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0'), ''];
                                                    d = text.padStart(2, '0');
                                                    const parsed = Date.parse(`${y}-${m}-${d}`);
                                                    if (!isNaN(parsed)) focusedTask.dueDate = parsed;
                                                }}
                                            />
                                            <TextInput
                                                style={{ flex: 1, backgroundColor: '#222', color: '#fff', padding: 12 * sf, borderRadius: 12, fontSize: 14 * sf, textAlign: 'center' }}
                                                placeholder="MM"
                                                keyboardType="numeric"
                                                maxLength={2}
                                                placeholderTextColor="#666"
                                                defaultValue={focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-')[1] : ''}
                                                onChangeText={text => {
                                                    let [y, m, d] = focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-') : [new Date().getFullYear().toString(), '', new Date().getDate().toString().padStart(2, '0')];
                                                    m = text.padStart(2, '0');
                                                    const parsed = Date.parse(`${y}-${m}-${d}`);
                                                    if (!isNaN(parsed)) focusedTask.dueDate = parsed;
                                                }}
                                            />
                                            <TextInput
                                                style={{ flex: 2, backgroundColor: '#222', color: '#fff', padding: 12 * sf, borderRadius: 12, fontSize: 14 * sf, textAlign: 'center' }}
                                                placeholder="YYYY"
                                                keyboardType="numeric"
                                                maxLength={4}
                                                placeholderTextColor="#666"
                                                defaultValue={focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-')[0] : ''}
                                                onChangeText={text => {
                                                    let [y, m, d] = focusedTask.dueDate ? new Date(focusedTask.dueDate).toISOString().split('T')[0].split('-') : ['', (new Date().getMonth() + 1).toString().padStart(2, '0'), new Date().getDate().toString().padStart(2, '0')];
                                                    y = text;
                                                    if (y.length === 4) {
                                                        const parsed = Date.parse(`${y}-${m}-${d}`);
                                                        if (!isNaN(parsed)) focusedTask.dueDate = parsed;
                                                    }
                                                }}
                                            />
                                        </View>

                                        <TouchableOpacity style={{ backgroundColor: '#fff', padding: 14 * bf, borderRadius: 12, alignItems: 'center', marginTop: 24 }} onPress={saveFocusedTask}>
                                            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 * sf }}>Guardar detalles</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            </KeyboardAvoidingView>
                        </View>
                    </Modal>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tab: { borderRadius: 16, backgroundColor: '#222', justifyContent: 'center' },
    activeTab: { backgroundColor: '#fff' },
    tabText: { color: '#ccc' },
    activeTabText: { color: '#000', fontWeight: 'bold' },

    creationBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222' },
    input: { flex: 1, color: '#fff', padding: 0 },

    taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
    checkbox: { borderWidth: 2, borderColor: '#444', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: '#fff', borderColor: '#fff' },
    taskText: { color: '#eee' },
    taskTextDone: { color: '#666', textDecorationLine: 'line-through' },

    footer: { backgroundColor: '#1a1a1a', flexDirection: 'row', alignItems: 'center', gap: 10 },
    taskInput: {},
    sendButton: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    filterOption: { padding: 16, backgroundColor: '#222', borderRadius: 12, marginBottom: 8 },
    filterOptionActive: { backgroundColor: '#333', borderColor: '#555', borderWidth: 1 },
    filterText: { color: '#ccc', textAlign: 'center' },
    filterTextActive: { color: '#fff', fontWeight: 'bold' }
});
