// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,

    // 👇 externalize all native / peer deps
    external: [
        "react",
        "react-native",
        "react-native-svg",
        "react-native-reanimated",
        "react-native-gesture-handler",
        "@shopify/flash-list",
        "@shopify/react-native-skia",
        "expo-haptics",
        "expo-image",
        "react-content-loader",
        "@expo/vector-icons"
    ],
});
