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
        setSelectedPhoto(item);
    };

    const closePhoto = () => {
        setSelectedPhoto(null);
    };

    const renderItem = ({item} : {item: PhotoItem }) => (
        <TouchableOpacity style={styles.item} onPress={() => openPhoto(item)}>
            <Image source={{ uri: item.uri }} style = {styles.photo} />
        </TouchableOpacity>
    );

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

    return (
        <View style={styles.container}>
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