import './global.css';
import '@/i18n';

import React, {Component, ErrorInfo, ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {NavigationContainer} from '@react-navigation/native';
import {RootNavigator} from '@/navigation';
import {theme} from '@/styles/theme';
import {SafeAreaProvider} from "react-native-safe-area-context";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/**
 * ErrorBoundary catches JavaScript errors in child components,
 * logs the error, and displays a fallback UI with Dutch error message.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
        return {hasError: true};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        Er is iets misgegaan. Herstart de app.
                    </Text>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    errorText: {
        color: theme.colors.onBackground,
        fontSize: theme.typography.bodyLarge,
        textAlign: 'center',
    },
});

/**
 * Root application component that wraps the entire app with
 * necessary providers for navigation and safe area handling.
 */
export default function App(): React.JSX.Element {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <NavigationContainer>
                    <StatusBar style="light"/>
                    <RootNavigator/>
                </NavigationContainer>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
