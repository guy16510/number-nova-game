import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RewardState } from '../domain/types';
import type { PlayerProgress, RewardLoadout } from '../infrastructure/ProgressRepository';

interface RewardOption extends RewardState {
  readonly symbol: string;
  readonly previewColor: string;
}

const REWARDS: readonly RewardOption[] = [
  { id: 'cyan-laser', name: 'Cyan Nova Laser', description: 'A bright new laser color for your ship.', type: 'laser-color', symbol: '✦', previewColor: '#52EDFF' },
  { id: 'comet-trail', name: 'Comet Engine Trail', description: 'Leave a sparkling comet trail across space.', type: 'engine-trail', symbol: '≈', previewColor: '#B774FF' },
  { id: 'solar-paint', name: 'Solar Flare Paint', description: 'A fiery orange paint job for the Nova ship.', type: 'ship-paint', symbol: '▲', previewColor: '#FF793C' },
  { id: 'pip-companion', name: 'Pip the Space Buddy', description: 'A friendly alien copilot joins future missions.', type: 'companion', symbol: '●', previewColor: '#7DFFB2' },
  { id: 'asteroid-ace', name: 'Asteroid Ace Badge', description: 'Proof that you survived the asteroid ambush.', type: 'badge', symbol: '★', previewColor: '#FFE15A' },
];

interface HangarScreenProps {
  readonly progress: PlayerProgress;
  readonly onEquip: (rewardId: string, rewardType: RewardState['type']) => void;
  readonly onClose: () => void;
}

const equippedId = (loadout: RewardLoadout, type: RewardState['type']): string | null => {
  if (type === 'laser-color') return loadout.laserColor;
  if (type === 'engine-trail') return loadout.engineTrail;
  if (type === 'ship-paint') return loadout.shipPaint;
  if (type === 'companion') return loadout.companion;
  return null;
};

export const HangarScreen = ({ progress, onEquip, onClose }: HangarScreenProps) => {
  const paint = progress.equippedRewards.shipPaint === 'solar-paint' ? '#FF793C' : '#D8E8FF';
  const laser = progress.equippedRewards.laserColor === 'cyan-laser' ? '#52EDFF' : '#8C7BFF';
  const trail = progress.equippedRewards.engineTrail === 'comet-trail' ? '#B774FF' : '#2BCFFF';
  const companion = progress.equippedRewards.companion === 'pip-companion';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.back}><Text style={styles.backText}>‹ BACK</Text></Pressable>
        <View style={styles.heading}>
          <Text style={styles.kicker}>NOVA HANGAR</Text>
          <Text style={styles.title}>Make the ship yours</Text>
          <Text style={styles.body}>Rewards are earned through play. Nothing here is random or for sale.</Text>
        </View>
        <View style={styles.rewardCount}><Text style={styles.rewardCountValue}>{progress.unlockedRewards.length}</Text><Text style={styles.rewardCountLabel}>UNLOCKED</Text></View>
      </View>

      <View style={styles.content}>
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>CURRENT LOADOUT</Text>
          <View style={styles.previewSpace}>
            <View style={[styles.trail, { backgroundColor: trail }]} />
            <View style={[styles.shipWing, styles.leftWing, { backgroundColor: paint }]} />
            <View style={[styles.shipWing, styles.rightWing, { backgroundColor: paint }]} />
            <View style={[styles.shipBody, { borderColor: paint }]}>
              <View style={styles.canopy} />
            </View>
            <View style={[styles.laser, styles.leftLaser, { backgroundColor: laser }]} />
            <View style={[styles.laser, styles.rightLaser, { backgroundColor: laser }]} />
            {companion ? <View style={styles.companion}><Text style={styles.companionFace}>•ᴗ•</Text></View> : null}
          </View>
          <Text style={styles.loadoutText}>{companion ? 'Pip is flying with you' : 'No companion equipped yet'}</Text>
        </View>

        <View style={styles.inventory}>
          {REWARDS.map((reward) => {
            const unlocked = progress.unlockedRewards.includes(reward.id);
            const equipped = equippedId(progress.equippedRewards, reward.type) === reward.id;
            return (
              <Pressable
                key={reward.id}
                accessibilityRole="button"
                disabled={!unlocked || reward.type === 'badge'}
                onPress={() => onEquip(reward.id, reward.type)}
                style={({ pressed }: { pressed: boolean }) => [styles.rewardCard, equipped && styles.rewardEquipped, !unlocked && styles.rewardLocked, pressed && styles.pressed]}
              >
                <View style={[styles.rewardIcon, { borderColor: reward.previewColor }]}><Text style={[styles.rewardSymbol, { color: reward.previewColor }]}>{reward.symbol}</Text></View>
                <View style={styles.rewardCopy}>
                  <Text style={styles.rewardName}>{unlocked ? reward.name : 'Locked reward'}</Text>
                  <Text style={styles.rewardDescription}>{unlocked ? reward.description : 'Complete more missions to reveal this reward.'}</Text>
                </View>
                <View style={[styles.statePill, equipped && styles.statePillEquipped]}>
                  <Text style={styles.stateText}>{equipped ? 'EQUIPPED' : unlocked ? reward.type === 'badge' ? 'EARNED' : 'EQUIP' : 'LOCKED'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02031A', padding: 22 },
  header: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { borderWidth: 1, borderColor: '#5369A3', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 9 },
  backText: { color: '#BFE9FF', fontSize: 12, fontWeight: '900' },
  heading: { flex: 1, alignItems: 'center' },
  kicker: { color: '#FFE15A', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900' },
  body: { color: '#AFC5F4', fontSize: 13, fontWeight: '600', marginTop: 2 },
  rewardCount: { minWidth: 94, alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#5369A3', padding: 8 },
  rewardCountValue: { color: '#FFE15A', fontSize: 20, fontWeight: '900' },
  rewardCountLabel: { color: '#9FB5E8', fontSize: 9, fontWeight: '900' },
  content: { flex: 1, flexDirection: 'row', gap: 22, alignItems: 'center' },
  previewCard: { width: '38%', minWidth: 380, height: '82%', minHeight: 430, borderRadius: 28, borderWidth: 2, borderColor: '#39D6FF', backgroundColor: '#071345E8', alignItems: 'center', justifyContent: 'center' },
  previewLabel: { color: '#9FBAF3', fontSize: 11, fontWeight: '900', letterSpacing: 1.7, marginBottom: 20 },
  previewSpace: { width: 320, height: 260, alignItems: 'center', justifyContent: 'center' },
  trail: { position: 'absolute', width: 38, height: 120, borderRadius: 19, bottom: 0, opacity: 0.55 },
  shipBody: { width: 112, height: 150, borderRadius: 56, borderWidth: 10, backgroundColor: '#27375F', alignItems: 'center', paddingTop: 24, zIndex: 3 },
  canopy: { width: 52, height: 62, borderRadius: 26, backgroundColor: '#63DFFF', borderWidth: 4, borderColor: '#D7FBFF' },
  shipWing: { position: 'absolute', width: 100, height: 54, borderRadius: 24, top: 115, zIndex: 2 },
  leftWing: { left: 45, transform: [{ rotate: '-24deg' }] },
  rightWing: { right: 45, transform: [{ rotate: '24deg' }] },
  laser: { position: 'absolute', width: 10, height: 88, borderRadius: 5, top: 4, opacity: 0.9 },
  leftLaser: { left: 86 },
  rightLaser: { right: 86 },
  companion: { position: 'absolute', right: 18, top: 46, width: 65, height: 65, borderRadius: 33, backgroundColor: '#7DFFB2', borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  companionFace: { color: '#12355A', fontSize: 17, fontWeight: '900' },
  loadoutText: { color: '#D4E1FF', fontSize: 15, fontWeight: '800', marginTop: 16 },
  inventory: { flex: 1, gap: 10 },
  rewardCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 2, borderColor: '#334C83', backgroundColor: '#08113CDD', paddingHorizontal: 13, paddingVertical: 9 },
  rewardEquipped: { borderColor: '#FFE15A', backgroundColor: '#182151EE' },
  rewardLocked: { opacity: 0.46 },
  pressed: { transform: [{ scale: 0.985 }] },
  rewardIcon: { width: 54, height: 54, borderRadius: 27, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  rewardSymbol: { fontSize: 27, fontWeight: '900' },
  rewardCopy: { flex: 1, marginLeft: 13 },
  rewardName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  rewardDescription: { color: '#AFC5F4', fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 2 },
  statePill: { minWidth: 72, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#51699E', paddingHorizontal: 8, paddingVertical: 6 },
  statePillEquipped: { backgroundColor: '#7E5A16', borderColor: '#FFE15A' },
  stateText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
});
