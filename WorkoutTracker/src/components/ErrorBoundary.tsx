import React, { Component, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.container}>
          <Text style={styles.title}>Something went wrong!</Text>
          <Text style={styles.error}>{this.state.error?.toString()}</Text>
          {this.state.errorInfo && (
            <Text style={styles.stack}>{this.state.errorInfo.componentStack}</Text>
          )}
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  error: {
    fontSize: 14,
    marginBottom: 10,
    color: '#333',
  },
  stack: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});