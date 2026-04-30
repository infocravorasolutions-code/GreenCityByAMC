import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Colors, Shadows } from '../theme/Theme';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) });
    textOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: withTiming(textOpacity.value ? 0 : 20, { duration: 800 }) }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedIconStyle]}>
        <View style={styles.iconCircle}>
          <Image
            source={require('../assets/logo.png')}
            style={{ width: 200, height: 200, resizeMode: 'contain' }}
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, animatedTextStyle]}>
        <Text style={styles.title}>GREEN CITY</Text>
        <Text style={styles.subtitle}>AMC PORTAL</Text>
      </Animated.View>

      <View style={styles.footer}>
        {/* <Text style={styles.footerText}>POWERED BY</Text> */}
        {/* <View style={styles.cravoraBadge}>
          <Image 
            source={require('../assets/cravoraLogo.png')} 
            style={{ width: 110, height: 30, resizeMode: 'contain' }} 
          />
        </View> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.surface, // Better contrast for most logos
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows?.medium,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.surface,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.surface,
    letterSpacing: 8,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 35,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  cravoraBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
