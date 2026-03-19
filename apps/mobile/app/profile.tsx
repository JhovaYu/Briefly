import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getUserProfile, saveUserProfile } from '../src/storage';
import { useApp } from '../src/AppContext';
import { StatusBar } from 'expo-status-bar';

export default function ProfileSettings() {
    const router = useRouter();
    const { settings, updateSettings } = useApp();
    const sf = settings.fontSizeMultiplier;

    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        getUserProfile().then(p => {
            if (p) setProfile(p);
            else router.replace('/');
        });
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && profile) {
            const uri = result.assets[0].uri;
            const updated = { ...profile, avatarUri: uri };
            await saveUserProfile(updated);
            setProfile(updated);
        }
    };

    const changeScale = (delta: number) => {
        let newScale = Number((sf + delta).toFixed(1));
        if (newScale < 0.8) newScale = 0.8;
        if (newScale > 1.5) newScale = 1.5;
        updateSettings({ fontSizeMultiplier: newScale });
    };

    const changeButtonScale = (delta: number) => {
        let newScale = Number(((settings.buttonSizeMultiplier || 1) + delta).toFixed(1));
        if (newScale < 0.5) newScale = 0.5;
        if (newScale > 3.0) newScale = 3.0;
        updateSettings({ buttonSizeMultiplier: newScale });
    };

    if (!profile) return <View style={styles.container} />;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: '#fff', fontSize: 16 * sf }}>← Volver</Text>
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 18 * sf, fontWeight: 'bold' }}>Ajustes</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Perfil */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { fontSize: 14 * sf }]}>Tu Perfil</Text>
                    <View style={styles.profileCard}>
                        <TouchableOpacity onPress={pickImage}>
                            {profile.avatarUri ? (
                                <Image source={{ uri: profile.avatarUri }} style={[styles.avatarBig, { width: 80 * sf, height: 80 * sf, borderRadius: 40 * sf }]} />
                            ) : (
                                <View style={[styles.avatarBig, { backgroundColor: profile.color, width: 80 * sf, height: 80 * sf, borderRadius: 40 * sf }]} />
                            )}
                            <View style={styles.editBadge}>
                                <Text style={{ fontSize: 10 * sf, color: '#fff' }}>✎</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.name, { fontSize: 20 * sf }]}>{profile.name}</Text>
                        <Text style={[styles.id, { fontSize: 12 * sf }]}>ID: {profile.id}</Text>
                    </View>
                </View>

                {/* Accesibilidad */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { fontSize: 14 * sf }]}>Accesibilidad y Apariencia</Text>

                    <View style={styles.card}>
                        <Text style={{ color: '#fff', fontSize: 16 * sf, marginBottom: 12 }}>Tamaño de fuente</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TouchableOpacity style={styles.scaleButton} onPress={() => changeScale(-0.1)}>
                                <Text style={styles.scaleText}>A-</Text>
                            </TouchableOpacity>
                            <Text style={{ color: '#888', fontSize: 16 }}>{sf.toFixed(1)}x</Text>
                            <TouchableOpacity style={styles.scaleButton} onPress={() => changeScale(0.1)}>
                                <Text style={styles.scaleText}>A+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.card, { marginTop: 16 }]}>
                        <Text style={{ color: '#fff', fontSize: 16 * sf, marginBottom: 12 }}>Tamaño de botones en espacio</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TouchableOpacity style={styles.scaleButton} onPress={() => changeButtonScale(-0.1)}>
                                <Text style={styles.scaleText}>-</Text>
                            </TouchableOpacity>
                            <Text style={{ color: '#888', fontSize: 16 }}>{(settings.buttonSizeMultiplier || 1).toFixed(1)}x</Text>
                            <TouchableOpacity style={styles.scaleButton} onPress={() => changeButtonScale(0.1)}>
                                <Text style={styles.scaleText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
    section: { marginBottom: 32 },
    sectionTitle: { color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    profileCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, alignItems: 'center' },
    avatarBig: { marginBottom: 16 },
    editBadge: { position: 'absolute', bottom: 16, right: 0, backgroundColor: '#333', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1a1a1a' },
    name: { color: '#fff', fontWeight: 'bold', marginBottom: 4 },
    id: { color: '#666' },
    card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20 },
    scaleButton: { backgroundColor: '#333', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    scaleText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
