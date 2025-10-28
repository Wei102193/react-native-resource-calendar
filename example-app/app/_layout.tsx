import FontAwesome from '@expo/vector-icons/FontAwesome';
import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {useFonts} from 'expo-font';
import {
    NunitoSans_200ExtraLight,
    NunitoSans_200ExtraLight_Italic,
    NunitoSans_300Light,
    NunitoSans_300Light_Italic,
    NunitoSans_400Regular,
    NunitoSans_400Regular_Italic,
    NunitoSans_600SemiBold,
    NunitoSans_600SemiBold_Italic,
    NunitoSans_700Bold,
    NunitoSans_700Bold_Italic,
    NunitoSans_800ExtraBold,
    NunitoSans_800ExtraBold_Italic,
    NunitoSans_900Black,
    NunitoSans_900Black_Italic,
} from "@expo-google-fonts/nunito-sans";
import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';
import 'react-native-reanimated';

import {useColorScheme} from '@/components/useColorScheme';
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {CalendarBindingProvider} from "react-native-resource-calendar";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
    // Ensure that reloading on `/modal` keeps a back button present.
    initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        ...FontAwesome.font,
        NunitoSans_200ExtraLight,
        NunitoSans_200ExtraLight_Italic,
        NunitoSans_300Light,
        NunitoSans_300Light_Italic,
        NunitoSans_400Regular,
        NunitoSans_400Regular_Italic,
        NunitoSans_600SemiBold,
        NunitoSans_600SemiBold_Italic,
        NunitoSans_700Bold,
        NunitoSans_700Bold_Italic,
        NunitoSans_800ExtraBold,
        NunitoSans_800ExtraBold_Italic,
        NunitoSans_900Black,
        NunitoSans_900Black_Italic,
    });

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) throw error;
    }, [error]);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return <RootLayoutNav/>;
}

function RootLayoutNav() {
    const colorScheme = useColorScheme();
    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <GestureHandlerRootView>
                <CalendarBindingProvider>
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                        <Stack.Screen name="modal" options={{presentation: 'modal'}}/>
                    </Stack>
                </CalendarBindingProvider>
            </GestureHandlerRootView>
        </ThemeProvider>
    );
}
