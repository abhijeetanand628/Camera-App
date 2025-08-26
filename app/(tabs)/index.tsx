import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal} from 'react-native';
import { VideoView, useVideoPlayer } from "expo-video";
import { CameraView, useCameraPermissions, useMicrophonePermissions, BarcodeScanningResult } from "expo-camera";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";

export default function CameraTab() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const [facing, setFacing] = useState<"back" | "front">("back"); // Tells which camera is active. It is initially set to BACK.
    const [zoom, setZoom] = useState(0);
    const [capturedPhotos, setCapturedPhotos] = useState<Array<{uri: string; type?: "photo" | "video"}>>(
        [] // This Array stores the URI's of the photos we take.
    );
    const [permission, requestPermission] = useCameraPermissions(); // useCameraPermissions() is an Expo hook that returns permission state
    const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
    const [isBarcodeMode, setIsBarcodeMode] = useState(false);
    const [barCodeResult, setBarCodeResult] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null); // It allows us to directly interact with our camera.
    const [isRecording, setIsRecording] = useState(false);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const player = useVideoPlayer({ uri: "" });
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraMode, setCameraMode] = useState<"picture" | "video">("picture");
    const [resumeAfterFlip, setResumeAfterFlip] = useState(false);
    useEffect(() => {
        if (recordedUri) {
            // @ts-ignore replace is available at runtime in expo-video
            player.replace({ uri: recordedUri });
        }
    }, [recordedUri]);

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // User is not logged in, redirect to login screen
        router.replace("/auth/login"); // make sure this matches your login route
      }
    });

    return () => unsubscribe(); // clean up listener
  }, []);

    const loadSavedPhotos = useCallback(async() => {
        try {
            const savedPhotos = await AsyncStorage.getItem("capturedPhotos");
            if(savedPhotos) {
                setCapturedPhotos(JSON.parse(savedPhotos));
            }
        } catch(error) {
            console.error("Failed to Load Photos", error);
        }
    }, []);

    useEffect(() => {
        loadSavedPhotos();
    }, [loadSavedPhotos]);

    useFocusEffect(
        useCallback(() => {
            loadSavedPhotos();
        }, [loadSavedPhotos])
    );

    const savePhotos = async (newPhoto: {uri: string; type?: "photo" | "video"}) => {
    setCapturedPhotos(prev => {
    const updated = [newPhoto, ...prev];
    AsyncStorage.setItem("capturedPhotos", JSON.stringify(updated));
    return updated;
  });
};

    const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Logged out successfully");
      // If using React Navigation:
      // navigation.replace("Login");
    } catch (error) {
      console.error("Logout failed: ", error);
    }
  };

    const toggleCameraFacing = useCallback(() => {
        const nextFacing = (prev: "back" | "front") => (prev === "back" ? "front" : "back");
        if (isRecording) {
            setResumeAfterFlip(true);
            setFacing(nextFacing);
            // stop current segment; startRecording will auto-resume when it resolves
            try { (cameraRef.current as any)?.stopRecording?.(); } catch {}
        } else {
            setFacing(nextFacing);
        }
    }, [isRecording]);

    const handleZoomChange = useCallback((value: number) => {
        setZoom(value);
    }, []);

    const takePicture = async () => {
    if (cameraRef.current) {
        try {
            const photo = await cameraRef.current.takePictureAsync({
            quality: 1,
            base64: false,
            exif: false,
        });
        const newPhoto: { uri: string; type: "photo" | "video" } = { uri: photo.uri + "?t=" + Date.now(), type: "photo" }; // ensure unique URI
        await savePhotos(newPhoto);
        } catch (err) {
        console.error("Failed to take photo", err);
        }
    }
    };

    const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

    const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    if (!isCameraReady) {
        await wait(300);
        if (!isCameraReady) {
            console.warn("Camera not ready yet");
            return;
        }
    }
    try {
        setIsRecording(true);
        setCameraMode("video");
        setIsCameraReady(false);
        await wait(600);
        if (!isCameraReady) {
            // give one more brief moment for mode switch
            await wait(300);
        }
        const video = await (cameraRef.current as any).recordAsync({
            // omit maxDuration initially for reliability
            mute: false,
        });
        if (video?.uri) {
            const newItem: { uri: string; type: "photo" | "video" } = { uri: video.uri + "?t=" + Date.now(), type: "video" };
            await savePhotos(newItem);
        }
        // Do not preview on Home; Photos tab will show saved media
        setRecordedUri(null);
    } catch (err) {
        console.error("Failed to record video", err);
    } finally {
        setIsRecording(false);
        if (resumeAfterFlip) {
            setResumeAfterFlip(false);
            setCameraMode("video");
            setIsCameraReady(false);
            await wait(400);
            startRecording();
        } else {
            setCameraMode("picture");
        }
    }
    };

    const stopRecording = () => {
    if (!cameraRef.current || !isRecording) return;
    try {
        (cameraRef.current as any).stopRecording();
    } catch (err) {
        console.error("Failed to stop recording", err);
    }
    };


    const toggleBarcodeMode = useCallback(() => {
        setIsBarcodeMode((prev) => !prev);
    }, []);

    const handleBarCodeScanned = useCallback(
        ({data} : BarcodeScanningResult) => {
            setBarCodeResult(data);
        }, []);

        if(!permission || !microphonePermission) {
            return <View />;
        }

        if(!permission.granted || !microphonePermission.granted) {
            return (
                <View style={styles.container}>
                    <Text style={styles.text}>
                        We need your camera and microphone permissions to continue
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={async () => {
                        if(!permission.granted) {
                            await requestPermission();
                        }
                        if(!microphonePermission.granted) {
                            await requestMicrophonePermission();
                        }
                    }}>
                        <Text style={styles.buttonText}>Grant Permissions</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={styles.container}>
                {isFocused && (
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        zoom={zoom}
                        mode={isBarcodeMode ? "picture" : cameraMode}
                        {...(cameraMode === "video" ? { videoQuality: "720p" } : {})}
                        barcodeScannerSettings={{
                            barcodeTypes: [
                                "qr",
                                "ean13",
                                "ean8",
                                "pdf417",
                                "aztec",
                                "datamatrix",
                            ],
                        }}
                        onBarcodeScanned={isBarcodeMode && cameraMode === "picture" ? handleBarCodeScanned : undefined}
                        onCameraReady={() => setIsCameraReady(true)}
                    />
                )}
                <View style={styles.controlContainer} pointerEvents="box-none">
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleLogout} 
                        >
                            <Text style={styles.buttonText}>Logout</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={toggleCameraFacing}
                        >
                            <Text style={styles.buttonText}>Flip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, isRecording && styles.buttonDisabled]} onPress={!isRecording ? toggleBarcodeMode : undefined} disabled={isRecording}>
                            <Text style={styles.buttonText}>
                                {isBarcodeMode ? "Photo Mode" : "Barcode Mode"} 
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.text}>Zoom: {zoom.toFixed(1)}x</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={1}
                            value={zoom}
                            onValueChange={handleZoomChange}
                        />
                    </View>
                    {!isBarcodeMode && (
                        <>
                            <View style={styles.row}>
                                <TouchableOpacity 
                                    style={styles.captureButton}
                                    onPress={takePicture}
                                >
                                    <Text style={styles.captureButtonText}>Take Photo</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <TouchableOpacity 
                                    style={styles.captureButton}
                                    onPress={isRecording ? stopRecording : startRecording}
                                >
                                    <Text style={styles.captureButtonText}>
                                        {isRecording ? "Stop Recording" : "Start Recording"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
                {/* No inline video preview; videos are sent to Photos */}
                <Modal 
                    animationType="slide"
                    transparent={true}
                    visible={!!barCodeResult}
                    onRequestClose={() => setBarCodeResult(null)}
                >
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Barcode Detected:</Text>
                        <Text style={styles.barcodeText}>{barCodeResult}</Text>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonClose]}
                            onPress={() => setBarCodeResult(null)}
                        >
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Modal> 
            </View>
        )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000"
    },
    camera: {
        flex: 1,
    },
    controlContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    row: {
        flexDirection: 'row',
        justifyContent: "space-around",
        alignItems: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: "#000",
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    text: {
        color: "#fff",
        marginLeft: 10,
    },
    slider: {
        flex: 1,
        marginLeft: 10,
    },
    captureButton: {
        backgroundColor: "#fff",
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    captureButtonText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "bold",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "bold",
    },
    barcodeText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 16,
    },
    buttonClose: {
        backgroundColor: "#2196F3",
        marginTop: 10,
    },
    videoContainer: {
        width: "100%",
        backgroundColor: "#000",
    },
    video: {
        width: "100%",
        height: 220,
    },
});