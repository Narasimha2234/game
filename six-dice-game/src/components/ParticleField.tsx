import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';

export interface ParticleFieldProps {
  type?: 'win' | 'lose';
  count?: number;
}

const WIN_COLORS = [
  '#F59E0B', // Bright Gold
  '#FBBF24', // Amber
  '#FCD34D', // Light Gold
  '#10B981', // Vivid Emerald
  '#34D399', // Mint Green
  '#8B5CF6', // Purple
  '#A855F7', // Neon Violet
  '#EC4899', // Hot Pink
  '#F43F5E', // Vivid Rose
  '#38BDF8', // Cyan
  '#FFFFFF', // Crisp White Sparkle
];

const WIN_EMOJIS = ['✨', '⭐', '🪙', '🎉'];

interface ParticleConfig {
  id: number;
  shape: 'ribbon' | 'square' | 'circle' | 'emoji';
  color: string;
  emoji?: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  peakY: number;
  endY: number;
  burstDistanceX: number;
  sway1: number;
  sway2: number;
  targetX: number;
  spinDeg: number;
  duration: number;
  delay: number;
}

const SingleParticle: React.FC<{
  config: ParticleConfig;
}> = React.memo(({ config }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const animate = (isFirst: boolean) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: config.duration,
        delay: isFirst ? config.delay : Math.random() * 400,
        easing: Easing.bezier(0.22, 0.8, 0.36, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isMountedRef.current) {
          animate(false);
        }
      });
    };

    animate(true);

    return () => {
      isMountedRef.current = false;
      anim.stopAnimation();
    };
  }, [anim, config]);

  // Cannon burst + floating flutter gravity fall right on top of screen
  const translateY = anim.interpolate({
    inputRange: [0, 0.28, 1],
    outputRange: [config.startY, config.peakY, config.endY],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 0.28, 0.55, 0.8, 1],
    outputRange: [
      config.startX,
      config.startX + config.burstDistanceX,
      config.startX + config.burstDistanceX + config.sway1,
      config.startX + config.burstDistanceX - config.sway2,
      config.targetX,
    ],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${config.spinDeg}deg`],
  });

  const scaleX = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.15, 1, 0.15, 1],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.04, 0.88, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.particleWrap,
        {
          transform: [{ translateX }, { translateY }, { rotate }, { scaleX }],
          opacity,
        },
      ]}
    >
      {config.shape === 'ribbon' && (
        <View
          style={[
            styles.ribbon,
            {
              backgroundColor: config.color,
              width: config.width,
              height: config.height,
            },
          ]}
        />
      )}
      {config.shape === 'square' && (
        <View
          style={[
            styles.square,
            {
              backgroundColor: config.color,
              width: config.width,
              height: config.height,
            },
          ]}
        />
      )}
      {config.shape === 'circle' && (
        <View
          style={[
            styles.circle,
            {
              backgroundColor: config.color,
              width: config.width,
              height: config.width,
              borderRadius: config.width / 2,
            },
          ]}
        />
      )}
      {config.shape === 'emoji' && (
        <Text style={{ fontSize: config.width }}>{config.emoji}</Text>
      )}
    </Animated.View>
  );
});

const ParticleField: React.FC<ParticleFieldProps> = ({ count = 65 }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const particles: ParticleConfig[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const shapeRand = Math.random();
      let shape: ParticleConfig['shape'] = 'ribbon';
      let emoji: string | undefined;

      if (shapeRand < 0.40) {
        shape = 'ribbon';
      } else if (shapeRand < 0.70) {
        shape = 'square';
      } else if (shapeRand < 0.88) {
        shape = 'circle';
      } else {
        shape = 'emoji';
        emoji = WIN_EMOJIS[Math.floor(Math.random() * WIN_EMOJIS.length)];
      }

      const color = WIN_COLORS[i % WIN_COLORS.length];

      // Cannon burst from left, right, or top
      const side = i % 3; // 0 = left cannon, 1 = right cannon, 2 = top burst
      let startX = 0;
      let startY = 0;
      let peakY = 0;
      let burstDistanceX = 0;
      let targetX = 0;

      if (side === 0) {
        // Left cannon shooting up-right across the modal
        startX = Math.random() * (SCREEN_WIDTH * 0.25);
        startY = SCREEN_HEIGHT * 0.70 + Math.random() * 80;
        peakY = SCREEN_HEIGHT * 0.08 + Math.random() * (SCREEN_HEIGHT * 0.22);
        burstDistanceX = SCREEN_WIDTH * 0.40 + Math.random() * (SCREEN_WIDTH * 0.40);
        targetX = startX + burstDistanceX + (Math.random() - 0.5) * 60;
      } else if (side === 1) {
        // Right cannon shooting up-left across the modal
        startX = SCREEN_WIDTH * 0.75 + Math.random() * (SCREEN_WIDTH * 0.25);
        startY = SCREEN_HEIGHT * 0.70 + Math.random() * 80;
        peakY = SCREEN_HEIGHT * 0.08 + Math.random() * (SCREEN_HEIGHT * 0.22);
        burstDistanceX = -(SCREEN_WIDTH * 0.40 + Math.random() * (SCREEN_WIDTH * 0.40));
        targetX = startX + burstDistanceX + (Math.random() - 0.5) * 60;
      } else {
        // Top shower fountain raining directly over the modal
        startX = Math.random() * SCREEN_WIDTH;
        startY = -20 - Math.random() * 50;
        peakY = startY;
        burstDistanceX = (Math.random() - 0.5) * 90;
        targetX = startX + burstDistanceX + (Math.random() - 0.5) * 80;
      }

      return {
        id: i,
        shape,
        color,
        emoji,
        width:
          shape === 'ribbon'
            ? 7 + Math.random() * 5
            : shape === 'emoji'
            ? 18 + Math.random() * 8
            : 9 + Math.random() * 6,
        height: shape === 'ribbon' ? 16 + Math.random() * 10 : 9 + Math.random() * 6,
        startX,
        startY,
        peakY,
        endY: SCREEN_HEIGHT + 40,
        burstDistanceX,
        sway1: 20 + Math.random() * 30,
        sway2: 15 + Math.random() * 25,
        targetX,
        spinDeg: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
        duration: 2300 + Math.random() * 1100,
        delay: (i * 40) % 750,
      };
    });
  }, [count, SCREEN_WIDTH, SCREEN_HEIGHT]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <SingleParticle key={p.id} config={p} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  particleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99999,
  },
  ribbon: {
    borderRadius: 2,
  },
  square: {
    borderRadius: 2,
  },
  circle: {
    borderRadius: 999,
  },
});

export default ParticleField;
