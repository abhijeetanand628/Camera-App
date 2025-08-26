import React, {useState, useCallback, useEffect } from 'react';
import {View, Text, StyleSheet, Image, FlatList, Dimensions, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { VideoView, useVideoPlayer } from "expo-video";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from "expo-router";

type PhotoItem = {
    uri: string;
    type?: "photo" | "video";
};

const {width, height} = Dimensions.get("window");
const itemSize = width / 3;

export default function Detail() {
    const [capturedPhotos, setCapturedPhotos] = useState<PhotoItem[]>([]); // This state holds all captured photos.
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null); // This state shows the selected photo which will be shown in full screen mode when chosen.
    const player = useVideoPlayer({ uri: "" });
    const navigation = useNavigation();
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

    const loadSavedPhotos = useCallback(async () => {
        try {
            const savedPhotos = await AsyncStorage.getItem("capturedPhotos");
            if(savedPhotos) {
                setCapturedPhotos(JSON.parse(savedPhotos));
            }
        } catch (error) {
            console.error("Failed to Load Photos", error);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            loadSavedPhotos();
        })

        return unsubscribe;
    }, [navigation, loadSavedPhotos]);

    useEffect(() => {
        (async () => {
            if (selectedPhoto?.type === "video") {
                // @ts-ignore replaceAsync exists at runtime
                await player.replaceAsync({ uri: selectedPhoto.uri });
                try {
                    // @ts-ignore play exists at runtime
                    player.play();
                } catch {}
            } else {
                try {
                    // @ts-ignore pause exists at runtime
                    player.pause();
                } catch {}
            }
        })();
    }, [selectedPhoto]);

    const openPhoto = (item: PhotoItem) => {
        if (selectionMode) {
            toggleSelect(item.uri);
            return;
        }
        setSelectedPhoto(item);
    };

    const closePhoto = () => {
        setSelectedPhoto(null);
    };

    const toggleSelect = (uri: string) => {
        setSelectedUris(prev => {
            const next = new Set(prev);
            if (next.has(uri)) next.delete(uri); else next.add(uri);
            return next;
        });
    };

    const renderItem = ({item} : {item: PhotoItem }) => {
        const isChecked = selectedUris.has(item.uri);
        return (
            <TouchableOpacity style={styles.item} onPress={() => openPhoto(item)} onLongPress={() => setSelectionMode(true)}>
                <Image source={{ uri: item.uri }} style = {styles.photo} />
                {item.type === "video" && (
                    <View style={styles.overlay}>
                        <Text style={styles.playIcon}>▶</Text>
                    </View>
                )}
                {selectionMode && (
                    <View style={[styles.checkCircle, isChecked && styles.checkCircleChecked]}>
                        {isChecked && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const deleteItem = async (uri: string) => {
        try {
            const filtered = capturedPhotos.filter(p => p.uri !== uri);
            setCapturedPhotos(filtered);
            await AsyncStorage.setItem("capturedPhotos", JSON.stringify(filtered));
            setSelectedPhoto(null);
        } catch (e) {
            console.error("Failed to delete item", e);
        }
    };

    const renderFullScreenPhoto = () => (
        <Modal
            visible={selectedPhoto !== null}
            transparent={false}
            animationType="fade"
        >
            <SafeAreaView style={styles.fullScreenContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={closePhoto}>
                    <Text style={styles.closeButtonText}>x</Text>
                </TouchableOpacity>
                {selectedPhoto?.type === "video" ? (
                    <VideoView
                        player={player}
                        style={styles.fullScreenPhoto}
                        allowsFullscreen
                        allowsPictureInPicture
                        contentFit="contain"
                    />
                ) : (
                    <Image
                        source= {{uri: selectedPhoto?.uri }}
                        style={styles.fullScreenPhoto}
                        resizeMode='contain'
                    />
                )}
                <TouchableOpacity style={styles.deleteButton} onPress={() => selectedPhoto && deleteItem(selectedPhoto.uri)}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );

    const deleteSelected = async () => {
        try {
            const remaining = capturedPhotos.filter(p => !selectedUris.has(p.uri));
            setCapturedPhotos(remaining);
            setSelectedUris(new Set());
            setSelectionMode(false);
            await AsyncStorage.setItem("capturedPhotos", JSON.stringify(remaining));
        } catch (e) {
            console.error("Failed to delete selected", e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.toolbar}>
                <TouchableOpacity style={styles.toolbarButton} onPress={() => {
                    if (selectionMode) {
                        setSelectionMode(false);
                        setSelectedUris(new Set());
                    } else {
                        setSelectionMode(true);
                    }
                }}>
                    <Text style={styles.toolbarButtonText}>{selectionMode ? "Cancel" : "Select"}</Text>
                </TouchableOpacity>
                {selectionMode && (
                    <TouchableOpacity style={[styles.toolbarButton, styles.deleteSelected]} onPress={deleteSelected}>
                        <Text style={[styles.toolbarButtonText, styles.deleteSelectedText]}>Delete Selected ({selectedUris.size})</Text>
                    </TouchableOpacity>
                )}
            </View>
            {capturedPhotos.length > 0 ? (
                <FlatList
                    data={capturedPhotos}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={3}
                />
            ) : (
                <Text style={styles.noPhotosText}>No photos captured yet.</Text>
            )}
            {renderFullScreenPhoto()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    item: {
        width: itemSize,
        height: itemSize,
        padding: 2,
    },
    photo: {
        width: "100%",
        height: "100%",
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    toolbarButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eee',
        borderRadius: 6,
    },
    toolbarButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteSelected: {
        backgroundColor: '#ffebee',
    },
    deleteSelectedText: {
        color: '#d32f2f',
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.15)",
    },
    playIcon: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "bold",
        textShadowColor: "rgba(0,0,0,0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    checkCircle: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleChecked: {
        backgroundColor: '#2e7d32',
        borderColor: '#2e7d32',
    },
    checkMark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    noPhotosText: {
        fontSize: 18,
        textAlign: "center",
        marginTop: 50,
    },
    fullScreenContainer: {
        flex: 1,
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: 'center',
    },
    fullScreenPhoto: {
        width: width,
        height: height,
    },
    closeButton: {
        position: "absolute",
        top: 40,
        right: 20,
        zIndex: 1,
    },
    closeButtonText: {
        color: "white",
        fontSize: 36,
    },
    deleteButton: {
        position: "absolute",
        bottom: 40,
        alignSelf: "center",
        backgroundColor: "#ff4444",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    deleteButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
});