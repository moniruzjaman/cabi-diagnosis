import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  View,
  BackHandler,
  Platform,
  Alert,
  Linking,
  Share,
  SafeAreaView,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";

const APP_URL = "https://cabi-diagnosis.vercel.app";
const SHARE_TEXT =
  "🌾 উদ্ভিদ গোয়েন্দা — কৃষকের সহজ রোগ নির্ণয় অ্যাপ! CABI Plantwise প্রোটোকল দিয়ে ফসলের রোগ চিনুন।";

export default function AppScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle Android back button — go back in WebView or exit app
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      }
    );
    return () => backHandler.remove();
  }, [canGoBack]);

  // ── Native Bridge: Handle messages from WebView ──
  const handleWebViewMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (!msg.type) return;

        switch (msg.type) {
          case "SHARE": {
            // Native share dialog
            if (Platform.OS === "android") {
              try {
                await Share.share({
                  message: msg.text || SHARE_TEXT,
                  url: msg.url || APP_URL,
                });
              } catch {}
            }
            break;
          }

          case "CAMERA": {
            // Open camera to take photo
            const cameraResult = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.8,
              base64: true,
            });
            if (!cameraResult.canceled && cameraResult.assets?.[0]) {
              const asset = cameraResult.assets[0];
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('nativePhoto', {
                  detail: { base64: '${asset.base64}', uri: '${asset.uri}' }
                }));
              `);
            }
            break;
          }

          case "GALLERY": {
            // Open gallery to pick photo
            const galleryResult = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.8,
              base64: true,
            });
            if (!galleryResult.canceled && galleryResult.assets?.[0]) {
              const asset = galleryResult.assets[0];
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('nativePhoto', {
                  detail: { base64: '${asset.base64}', uri: '${asset.uri}' }
                }));
              `);
            }
            break;
          }

          case "OPEN_BROWSER": {
            // Open external URL in browser
            if (msg.url) {
              await WebBrowser.openBrowserAsync(msg.url);
            }
            break;
          }

          case "TTS": {
            // Text-to-Speech (native)
            // Note: WebView already handles TTS via Web Speech API
            // This is a fallback for devices without Web Speech support
            break;
          }

          case "VIBRATE": {
            // Haptic feedback
            // import * as Haptics from 'expo-haptics';
            // Haptics.selectionAsync();
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.log("Bridge error:", err);
      }
    },
    []
  );

  // ── Navigation state change ──
  const onNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  // ── JavaScript to inject for native bridge ──
  const injectedJavaScript = `
    (function() {
      // Create native bridge
      window.NativeBridge = {
        share: function(text, url) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'SHARE', text: text, url: url
          }));
        },
        camera: function() {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'CAMERA'
          }));
        },
        gallery: function() {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'GALLERY'
          }));
        },
        openBrowser: function(url) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'OPEN_BROWSER', url: url
          }));
        },
        isNative: true
      };

      // Override file input click for camera/gallery
      document.addEventListener('click', function(e) {
        var input = e.target;
        if (input.tagName === 'INPUT' && input.type === 'file' && input.accept && input.accept.indexOf('image') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          // Use gallery by default (camera needs explicit user trigger)
          window.NativeBridge.gallery();
          return false;
        }
      }, true);

      console.log('NativeBridge initialized');
      true;
    })();
  `;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="compatibility"
          onMessage={handleWebViewMessage}
          onNavigationStateChange={onNavigationStateChange}
          injectedJavaScript={injectedJavaScript}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner} />
            </View>
          )}
          // Error handling — show offline fallback
          renderError={() => (
            <View style={styles.errorContainer}>
              <View style={styles.errorContent}>
                <View style={styles.errorIcon}>🌾</View>
                <View style={styles.errorTitle}>উদ্ভিদ গোয়েন্দা</View>
                <View style={styles.errorText}>
                  ইন্টারনেট সংযোগ নেই। অনুগ্রহ করে আপনার ডেটা/Wi-Fi চালু করুন।
                </View>
                <View
                  style={styles.retryButton}
                  onTouchEnd={() => webViewRef.current?.reload()}
                >
                  <View style={styles.retryText}>🔄 আবার চেষ্টা করুন</View>
                </View>
              </View>
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            // Keep internal navigation in WebView
            if (request.url.startsWith(APP_URL)) {
              return true;
            }
            // External links open in system browser
            if (
              request.url.includes("facebook.com") ||
              request.url.includes("linkedin.com") ||
              request.url.includes("twitter.com") ||
              request.url.includes("wa.me") ||
              request.url.includes("drive.google.com") ||
              request.url.includes("youtube.com")
            ) {
              WebBrowser.openBrowserAsync(request.url);
              return false;
            }
            return true;
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#006028",
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#006028",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    // Animation would need Animated API
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f4f6f8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#006028",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#006028",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
