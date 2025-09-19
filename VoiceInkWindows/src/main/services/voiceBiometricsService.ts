import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

interface VoicePrint {
  id: string;
  userId: string;
  features: VoiceFeatures;
  enrollmentSamples: AudioSample[];
  createdAt: Date;
  updatedAt: Date;
  quality: number;
  status: 'active' | 'pending' | 'disabled';
  metadata: Map<string, any>;
}

interface VoiceFeatures {
  mfcc: number[][];           // Mel-frequency cepstral coefficients
  pitch: PitchFeatures;
  formants: FormantFeatures;
  spectral: SpectralFeatures;
  prosody: ProsodyFeatures;
  embedding: number[];        // Deep learning embedding vector
}

interface PitchFeatures {
  fundamental: number;
  mean: number;
  std: number;
  range: [number, number];
  contour: number[];
  jitter: number;
}

interface FormantFeatures {
  f1: { mean: number; std: number };
  f2: { mean: number; std: number };
  f3: { mean: number; std: number };
  f4: { mean: number; std: number };
  transitions: number[][];
}

interface SpectralFeatures {
  centroid: number;
  rolloff: number;
  flux: number;
  bandwidth: number;
  contrast: number[];
  flatness: number;
}

interface ProsodyFeatures {
  speakingRate: number;
  pauseDuration: number;
  rhythmPattern: number[];
  stressPattern: number[];
  intonation: number[];
}

interface AudioSample {
  id: string;
  data: Buffer;
  sampleRate: number;
  duration: number;
  quality: number;
  timestamp: Date;
  environment: 'quiet' | 'noisy' | 'reverberant';
}

interface VerificationResult {
  match: boolean;
  confidence: number;
  score: number;
  threshold: number;
  userId?: string;
  factors: {
    mfcc: number;
    pitch: number;
    formants: number;
    spectral: number;
    prosody: number;
    embedding: number;
  };
  livenessDetection: LivenessResult;
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  checks: {
    challenge: boolean;
    microMovements: boolean;
    audioQuality: boolean;
    environmentConsistency: boolean;
  };
}

interface EnrollmentSession {
  id: string;
  userId: string;
  samples: AudioSample[];
  progress: number;
  requiredSamples: number;
  status: 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  challenges: string[];
}

interface SpeakerDiarization {
  segments: Array<{
    speaker: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  speakers: Map<string, SpeakerProfile>;
  timeline: number[];
}

interface SpeakerProfile {
  id: string;
  features: VoiceFeatures;
  segments: number;
  totalDuration: number;
  confidence: number;
}

interface AntiSpoofingConfig {
  challengeResponse: boolean;
  replayDetection: boolean;
  synthesisDetection: boolean;
  conversionDetection: boolean;
  environmentAnalysis: boolean;
  thresholds: {
    liveness: number;
    replay: number;
    synthesis: number;
  };
}

class VoiceBiometricsService extends EventEmitter {
  private voicePrints: Map<string, VoicePrint> = new Map();
  private enrollmentSessions: Map<string, EnrollmentSession> = new Map();
  private featureExtractors: Map<string, any> = new Map();
  private verificationCache: Map<string, VerificationResult> = new Map();
  private antiSpoofingConfig: AntiSpoofingConfig;
  private modelCache: Map<string, any> = new Map();
  private storageDir: string;

  constructor(storageDir: string = './voice_biometrics') {
    super();
    this.storageDir = storageDir;
    this.antiSpoofingConfig = this.getDefaultAntiSpoofingConfig();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.ensureStorageDirectory();
    this.initializeFeatureExtractors();
    this.loadModels();
  }

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'voiceprints'), { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'samples'), { recursive: true });
    await fs.mkdir(path.join(this.storageDir, 'models'), { recursive: true });
  }

  private getDefaultAntiSpoofingConfig(): AntiSpoofingConfig {
    return {
      challengeResponse: true,
      replayDetection: true,
      synthesisDetection: true,
      conversionDetection: true,
      environmentAnalysis: true,
      thresholds: {
        liveness: 0.85,
        replay: 0.90,
        synthesis: 0.88
      }
    };
  }

  private initializeFeatureExtractors(): void {
    this.featureExtractors.set('mfcc', this.extractMFCC);
    this.featureExtractors.set('pitch', this.extractPitch);
    this.featureExtractors.set('formants', this.extractFormants);
    this.featureExtractors.set('spectral', this.extractSpectral);
    this.featureExtractors.set('prosody', this.extractProsody);
    this.featureExtractors.set('embedding', this.extractEmbedding);
  }

  private async loadModels(): Promise<void> {
    // Load pre-trained models for various tasks
    this.modelCache.set('embedding', { loaded: true }); // Placeholder
    this.modelCache.set('antispoofing', { loaded: true });
    this.modelCache.set('diarization', { loaded: true });
  }

  // Enrollment
  async startEnrollment(userId: string): Promise<EnrollmentSession> {
    const session: EnrollmentSession = {
      id: crypto.randomUUID(),
      userId,
      samples: [],
      progress: 0,
      requiredSamples: 5,
      status: 'in_progress',
      startTime: new Date(),
      challenges: this.generateChallenges()
    };

    this.enrollmentSessions.set(session.id, session);
    this.emit('enrollment-started', session);

    return session;
  }

  private generateChallenges(): string[] {
    const phrases = [
      "My voice is my passport",
      "The quick brown fox jumps over the lazy dog",
      "Please verify my identity",
      "Random number sequence: 7 3 9 2 5",
      "Today is a beautiful day"
    ];

    // Shuffle and return random subset
    return phrases.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  async addEnrollmentSample(
    sessionId: string,
    audioData: Buffer,
    sampleRate: number
  ): Promise<EnrollmentSession> {
    const session = this.enrollmentSessions.get(sessionId);
    if (!session) throw new Error('Enrollment session not found');

    // Validate audio quality
    const quality = await this.assessAudioQuality(audioData, sampleRate);
    if (quality < 0.7) {
      throw new Error('Audio quality too low. Please record in a quieter environment.');
    }

    // Check for spoofing
    const livenessResult = await this.detectLiveness(audioData, sampleRate);
    if (!livenessResult.isLive) {
      throw new Error('Liveness check failed');
    }

    const sample: AudioSample = {
      id: crypto.randomUUID(),
      data: audioData,
      sampleRate,
      duration: audioData.length / sampleRate / 2, // Assuming 16-bit audio
      quality,
      timestamp: new Date(),
      environment: this.detectEnvironment(audioData)
    };

    session.samples.push(sample);
    session.progress = session.samples.length / session.requiredSamples;

    // Check if enrollment is complete
    if (session.samples.length >= session.requiredSamples) {
      await this.completeEnrollment(session);
    }

    this.emit('enrollment-progress', session);
    return session;
  }

  private async completeEnrollment(session: EnrollmentSession): Promise<void> {
    try {
      // Extract features from all samples
      const features = await this.extractFeaturesFromSamples(session.samples);

      // Create voiceprint
      const voicePrint: VoicePrint = {
        id: crypto.randomUUID(),
        userId: session.userId,
        features,
        enrollmentSamples: session.samples,
        createdAt: new Date(),
        updatedAt: new Date(),
        quality: this.calculateVoiceprintQuality(features, session.samples),
        status: 'active',
        metadata: new Map()
      };

      // Save voiceprint
      await this.saveVoicePrint(voicePrint);
      this.voicePrints.set(voicePrint.userId, voicePrint);

      session.status = 'completed';
      this.emit('enrollment-completed', { session, voicePrint });
    } catch (error) {
      session.status = 'failed';
      this.emit('enrollment-failed', { session, error });
      throw error;
    }
  }

  private async extractFeaturesFromSamples(samples: AudioSample[]): Promise<VoiceFeatures> {
    const allFeatures: VoiceFeatures[] = [];

    for (const sample of samples) {
      const features = await this.extractFeatures(sample.data, sample.sampleRate);
      allFeatures.push(features);
    }

    // Average features across samples
    return this.averageFeatures(allFeatures);
  }

  private async extractFeatures(audioData: Buffer, sampleRate: number): Promise<VoiceFeatures> {
    return {
      mfcc: await this.extractMFCC(audioData, sampleRate),
      pitch: await this.extractPitch(audioData, sampleRate),
      formants: await this.extractFormants(audioData, sampleRate),
      spectral: await this.extractSpectral(audioData, sampleRate),
      prosody: await this.extractProsody(audioData, sampleRate),
      embedding: await this.extractEmbedding(audioData, sampleRate)
    };
  }

  private async extractMFCC(audioData: Buffer, sampleRate: number): Promise<number[][]> {
    // Simulate MFCC extraction
    const numCoefficients = 13;
    const numFrames = 100;
    const mfcc: number[][] = [];

    for (let i = 0; i < numFrames; i++) {
      const frame: number[] = [];
      for (let j = 0; j < numCoefficients; j++) {
        frame.push(Math.random() * 2 - 1);
      }
      mfcc.push(frame);
    }

    return mfcc;
  }

  private async extractPitch(audioData: Buffer, sampleRate: number): Promise<PitchFeatures> {
    // Simulate pitch extraction
    const pitchValues = Array(100).fill(0).map(() => 100 + Math.random() * 200);
    
    return {
      fundamental: 150 + Math.random() * 100,
      mean: pitchValues.reduce((a, b) => a + b) / pitchValues.length,
      std: this.calculateStd(pitchValues),
      range: [Math.min(...pitchValues), Math.max(...pitchValues)],
      contour: pitchValues,
      jitter: Math.random() * 0.02
    };
  }

  private async extractFormants(audioData: Buffer, sampleRate: number): Promise<FormantFeatures> {
    return {
      f1: { mean: 700 + Math.random() * 200, std: 50 + Math.random() * 30 },
      f2: { mean: 1220 + Math.random() * 200, std: 60 + Math.random() * 40 },
      f3: { mean: 2600 + Math.random() * 300, std: 80 + Math.random() * 50 },
      f4: { mean: 3500 + Math.random() * 400, std: 100 + Math.random() * 60 },
      transitions: Array(10).fill(0).map(() => Array(4).fill(0).map(() => Math.random()))
    };
  }

  private async extractSpectral(audioData: Buffer, sampleRate: number): Promise<SpectralFeatures> {
    return {
      centroid: 1500 + Math.random() * 1000,
      rolloff: 3000 + Math.random() * 2000,
      flux: Math.random() * 0.5,
      bandwidth: 1000 + Math.random() * 500,
      contrast: Array(7).fill(0).map(() => Math.random() * 30),
      flatness: Math.random() * 0.5
    };
  }

  private async extractProsody(audioData: Buffer, sampleRate: number): Promise<ProsodyFeatures> {
    return {
      speakingRate: 3 + Math.random() * 2, // syllables per second
      pauseDuration: 0.3 + Math.random() * 0.4,
      rhythmPattern: Array(20).fill(0).map(() => Math.random()),
      stressPattern: Array(10).fill(0).map(() => Math.random()),
      intonation: Array(50).fill(0).map(() => Math.random() * 2 - 1)
    };
  }

  private async extractEmbedding(audioData: Buffer, sampleRate: number): Promise<number[]> {
    // Simulate deep learning embedding (e.g., x-vector)
    const embeddingSize = 256;
    return Array(embeddingSize).fill(0).map(() => Math.random() * 2 - 1);
  }

  private calculateStd(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private averageFeatures(features: VoiceFeatures[]): VoiceFeatures {
    // Simplified averaging (in reality would be more sophisticated)
    return features[0]; // Placeholder
  }

  private calculateVoiceprintQuality(features: VoiceFeatures, samples: AudioSample[]): number {
    // Calculate quality based on consistency and signal quality
    const avgSampleQuality = samples.reduce((sum, s) => sum + s.quality, 0) / samples.length;
    const consistency = 0.8 + Math.random() * 0.2; // Placeholder
    return (avgSampleQuality + consistency) / 2;
  }

  // Verification
  async verify(
    audioData: Buffer,
    sampleRate: number,
    userId?: string
  ): Promise<VerificationResult> {
    // Check audio quality
    const quality = await this.assessAudioQuality(audioData, sampleRate);
    if (quality < 0.6) {
      return {
        match: false,
        confidence: 0,
        score: 0,
        threshold: 0.8,
        factors: { mfcc: 0, pitch: 0, formants: 0, spectral: 0, prosody: 0, embedding: 0 },
        livenessDetection: { isLive: false, confidence: 0, checks: {
          challenge: false, microMovements: false, audioQuality: false, environmentConsistency: false
        }}
      };
    }

    // Liveness detection
    const livenessResult = await this.detectLiveness(audioData, sampleRate);
    if (!livenessResult.isLive && this.antiSpoofingConfig.challengeResponse) {
      return {
        match: false,
        confidence: 0,
        score: 0,
        threshold: 0.8,
        factors: { mfcc: 0, pitch: 0, formants: 0, spectral: 0, prosody: 0, embedding: 0 },
        livenessDetection: livenessResult
      };
    }

    // Extract features from input
    const inputFeatures = await this.extractFeatures(audioData, sampleRate);

    // If userId is provided, verify against specific user
    if (userId) {
      const voicePrint = this.voicePrints.get(userId);
      if (!voicePrint) {
        throw new Error('User voiceprint not found');
      }

      return await this.verifyAgainstVoiceprint(inputFeatures, voicePrint, livenessResult);
    }

    // Otherwise, identify speaker from all enrolled users
    return await this.identifySpeaker(inputFeatures, livenessResult);
  }

  private async verifyAgainstVoiceprint(
    inputFeatures: VoiceFeatures,
    voicePrint: VoicePrint,
    livenessResult: LivenessResult
  ): Promise<VerificationResult> {
    const factors = {
      mfcc: this.compareMFCC(inputFeatures.mfcc, voicePrint.features.mfcc),
      pitch: this.comparePitch(inputFeatures.pitch, voicePrint.features.pitch),
      formants: this.compareFormants(inputFeatures.formants, voicePrint.features.formants),
      spectral: this.compareSpectral(inputFeatures.spectral, voicePrint.features.spectral),
      prosody: this.compareProsody(inputFeatures.prosody, voicePrint.features.prosody),
      embedding: this.compareEmbeddings(inputFeatures.embedding, voicePrint.features.embedding)
    };

    // Weighted average of all factors
    const weights = {
      mfcc: 0.25,
      pitch: 0.10,
      formants: 0.15,
      spectral: 0.10,
      prosody: 0.10,
      embedding: 0.30
    };

    const score = Object.entries(factors).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0
    );

    const threshold = 0.8;
    const match = score >= threshold;

    return {
      match,
      confidence: score,
      score,
      threshold,
      userId: match ? voicePrint.userId : undefined,
      factors,
      livenessDetection: livenessResult
    };
  }

  private async identifySpeaker(
    inputFeatures: VoiceFeatures,
    livenessResult: LivenessResult
  ): Promise<VerificationResult> {
    let bestMatch: VerificationResult | null = null;
    let bestScore = 0;

    for (const voicePrint of this.voicePrints.values()) {
      const result = await this.verifyAgainstVoiceprint(inputFeatures, voicePrint, livenessResult);
      
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMatch = result;
      }
    }

    return bestMatch || {
      match: false,
      confidence: 0,
      score: 0,
      threshold: 0.8,
      factors: { mfcc: 0, pitch: 0, formants: 0, spectral: 0, prosody: 0, embedding: 0 },
      livenessDetection: livenessResult
    };
  }

  private compareMFCC(input: number[][], reference: number[][]): number {
    // Dynamic Time Warping or cosine similarity
    return 0.7 + Math.random() * 0.3; // Placeholder
  }

  private comparePitch(input: PitchFeatures, reference: PitchFeatures): number {
    const meanDiff = Math.abs(input.mean - reference.mean) / reference.mean;
    const stdDiff = Math.abs(input.std - reference.std) / reference.std;
    const jitterDiff = Math.abs(input.jitter - reference.jitter);

    return Math.max(0, 1 - (meanDiff + stdDiff + jitterDiff) / 3);
  }

  private compareFormants(input: FormantFeatures, reference: FormantFeatures): number {
    const f1Diff = Math.abs(input.f1.mean - reference.f1.mean) / reference.f1.mean;
    const f2Diff = Math.abs(input.f2.mean - reference.f2.mean) / reference.f2.mean;
    const f3Diff = Math.abs(input.f3.mean - reference.f3.mean) / reference.f3.mean;

    return Math.max(0, 1 - (f1Diff + f2Diff + f3Diff) / 3);
  }

  private compareSpectral(input: SpectralFeatures, reference: SpectralFeatures): number {
    const centroidDiff = Math.abs(input.centroid - reference.centroid) / reference.centroid;
    const rolloffDiff = Math.abs(input.rolloff - reference.rolloff) / reference.rolloff;

    return Math.max(0, 1 - (centroidDiff + rolloffDiff) / 2);
  }

  private compareProsody(input: ProsodyFeatures, reference: ProsodyFeatures): number {
    const rateDiff = Math.abs(input.speakingRate - reference.speakingRate) / reference.speakingRate;
    const pauseDiff = Math.abs(input.pauseDuration - reference.pauseDuration) / reference.pauseDuration;

    return Math.max(0, 1 - (rateDiff + pauseDiff) / 2);
  }

  private compareEmbeddings(input: number[], reference: number[]): number {
    // Cosine similarity
    const dotProduct = input.reduce((sum, val, i) => sum + val * reference[i], 0);
    const magInput = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0));
    const magReference = Math.sqrt(reference.reduce((sum, val) => sum + val * val, 0));

    return (dotProduct / (magInput * magReference) + 1) / 2; // Normalize to 0-1
  }

  // Anti-spoofing
  private async detectLiveness(audioData: Buffer, sampleRate: number): Promise<LivenessResult> {
    const checks = {
      challenge: await this.verifyChallengeResponse(audioData),
      microMovements: await this.detectMicroMovements(audioData),
      audioQuality: await this.analyzeAudioQuality(audioData),
      environmentConsistency: await this.checkEnvironmentConsistency(audioData)
    };

    const scores = {
      replay: await this.detectReplayAttack(audioData, sampleRate),
      synthesis: await this.detectSynthesizedSpeech(audioData, sampleRate),
      conversion: await this.detectVoiceConversion(audioData, sampleRate)
    };

    const confidence = (scores.replay + scores.synthesis + scores.conversion) / 3;
    const isLive = confidence > this.antiSpoofingConfig.thresholds.liveness &&
                   Object.values(checks).filter(v => v).length >= 3;

    return {
      isLive,
      confidence,
      checks
    };
  }

  private async verifyChallengeResponse(audioData: Buffer): Promise<boolean> {
    // Check if audio contains expected challenge phrase
    return Math.random() > 0.2; // Placeholder
  }

  private async detectMicroMovements(audioData: Buffer): Promise<boolean> {
    // Detect natural micro-movements in voice
    return Math.random() > 0.1; // Placeholder
  }

  private async analyzeAudioQuality(audioData: Buffer): Promise<boolean> {
    // Check for artifacts indicating recording/playback
    return Math.random() > 0.15; // Placeholder
  }

  private async checkEnvironmentConsistency(audioData: Buffer): Promise<boolean> {
    // Verify consistent background noise and acoustics
    return Math.random() > 0.1; // Placeholder
  }

  private async detectReplayAttack(audioData: Buffer, sampleRate: number): Promise<number> {
    // Check for signs of recorded audio playback
    return 0.85 + Math.random() * 0.15; // Placeholder
  }

  private async detectSynthesizedSpeech(audioData: Buffer, sampleRate: number): Promise<number> {
    // Detect AI-generated speech
    return 0.80 + Math.random() * 0.20; // Placeholder
  }

  private async detectVoiceConversion(audioData: Buffer, sampleRate: number): Promise<number> {
    // Detect voice conversion attacks
    return 0.82 + Math.random() * 0.18; // Placeholder
  }

  // Speaker Diarization
  async diarizeSpeakers(
    audioData: Buffer,
    sampleRate: number,
    maxSpeakers?: number
  ): Promise<SpeakerDiarization> {
    const segments: SpeakerDiarization['segments'] = [];
    const speakers = new Map<string, SpeakerProfile>();
    
    // Simulate speaker diarization
    const duration = audioData.length / sampleRate / 2;
    let currentTime = 0;
    let speakerCount = 0;
    const numSpeakers = maxSpeakers || Math.floor(Math.random() * 3) + 2;

    while (currentTime < duration) {
      const segmentDuration = 2 + Math.random() * 8; // 2-10 seconds
      const speakerId = `speaker_${speakerCount % numSpeakers}`;
      
      segments.push({
        speaker: speakerId,
        start: currentTime,
        end: Math.min(currentTime + segmentDuration, duration),
        confidence: 0.7 + Math.random() * 0.3
      });

      // Update speaker profile
      if (!speakers.has(speakerId)) {
        speakers.set(speakerId, {
          id: speakerId,
          features: await this.extractFeatures(audioData, sampleRate), // Simplified
          segments: 0,
          totalDuration: 0,
          confidence: 0.8 + Math.random() * 0.2
        });
      }

      const profile = speakers.get(speakerId)!;
      profile.segments++;
      profile.totalDuration += segmentDuration;

      currentTime += segmentDuration;
      speakerCount++;
    }

    // Generate timeline
    const timeline = Array(Math.ceil(duration)).fill(0).map((_, i) => {
      const segment = segments.find(s => s.start <= i && i < s.end);
      return segment ? parseInt(segment.speaker.split('_')[1]) : -1;
    });

    return { segments, speakers, timeline };
  }

  // Audio Quality Assessment
  private async assessAudioQuality(audioData: Buffer, sampleRate: number): Promise<number> {
    // Calculate SNR, check for clipping, etc.
    const snr = 20 + Math.random() * 40; // dB
    const hasClipping = Math.random() < 0.1;
    const isNormalized = Math.random() > 0.3;

    let quality = Math.min(1, snr / 40);
    if (hasClipping) quality *= 0.5;
    if (!isNormalized) quality *= 0.9;

    return quality;
  }

  private detectEnvironment(audioData: Buffer): AudioSample['environment'] {
    const noise = Math.random();
    if (noise < 0.3) return 'quiet';
    if (noise < 0.7) return 'noisy';
    return 'reverberant';
  }

  // Storage
  private async saveVoicePrint(voicePrint: VoicePrint): Promise<void> {
    const filePath = path.join(this.storageDir, 'voiceprints', `${voicePrint.userId}.json`);
    
    // Save without audio data (stored separately)
    const toSave = {
      ...voicePrint,
      enrollmentSamples: voicePrint.enrollmentSamples.map(s => ({
        ...s,
        data: undefined,
        dataPath: path.join(this.storageDir, 'samples', `${s.id}.wav`)
      })),
      metadata: Array.from(voicePrint.metadata.entries())
    };

    await fs.writeFile(filePath, JSON.stringify(toSave));

    // Save audio samples
    for (const sample of voicePrint.enrollmentSamples) {
      const samplePath = path.join(this.storageDir, 'samples', `${sample.id}.wav`);
      await fs.writeFile(samplePath, sample.data);
    }
  }

  async loadVoicePrint(userId: string): Promise<VoicePrint | null> {
    try {
      const filePath = path.join(this.storageDir, 'voiceprints', `${userId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Load audio samples
      for (const sample of parsed.enrollmentSamples) {
        if (sample.dataPath) {
          sample.data = await fs.readFile(sample.dataPath);
          delete sample.dataPath;
        }
      }

      const voicePrint: VoicePrint = {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
        metadata: new Map(parsed.metadata)
      };

      return voicePrint;
    } catch (error) {
      return null;
    }
  }

  // Management
  async updateVoicePrint(
    userId: string,
    audioData: Buffer,
    sampleRate: number
  ): Promise<VoicePrint> {
    const voicePrint = this.voicePrints.get(userId);
    if (!voicePrint) throw new Error('Voiceprint not found');

    const newFeatures = await this.extractFeatures(audioData, sampleRate);
    
    // Adaptive update: blend new features with existing
    const alpha = 0.1; // Learning rate
    voicePrint.features = this.blendFeatures(voicePrint.features, newFeatures, alpha);
    voicePrint.updatedAt = new Date();

    await this.saveVoicePrint(voicePrint);
    return voicePrint;
  }

  private blendFeatures(
    existing: VoiceFeatures,
    newFeatures: VoiceFeatures,
    alpha: number
  ): VoiceFeatures {
    // Weighted average of features
    return {
      mfcc: existing.mfcc, // Complex blending needed
      pitch: {
        fundamental: existing.pitch.fundamental * (1 - alpha) + newFeatures.pitch.fundamental * alpha,
        mean: existing.pitch.mean * (1 - alpha) + newFeatures.pitch.mean * alpha,
        std: existing.pitch.std * (1 - alpha) + newFeatures.pitch.std * alpha,
        range: existing.pitch.range,
        contour: existing.pitch.contour,
        jitter: existing.pitch.jitter * (1 - alpha) + newFeatures.pitch.jitter * alpha
      },
      formants: existing.formants, // Simplified
      spectral: existing.spectral,
      prosody: existing.prosody,
      embedding: existing.embedding.map((v, i) => v * (1 - alpha) + newFeatures.embedding[i] * alpha)
    };
  }

  async deleteVoicePrint(userId: string): Promise<void> {
    const voicePrint = this.voicePrints.get(userId);
    if (!voicePrint) return;

    // Delete files
    const filePath = path.join(this.storageDir, 'voiceprints', `${userId}.json`);
    await fs.unlink(filePath).catch(() => {});

    for (const sample of voicePrint.enrollmentSamples) {
      const samplePath = path.join(this.storageDir, 'samples', `${sample.id}.wav`);
      await fs.unlink(samplePath).catch(() => {});
    }

    this.voicePrints.delete(userId);
    this.emit('voiceprint-deleted', userId);
  }

  // Analytics
  async getVerificationStats(userId: string): Promise<any> {
    const cacheKey = `stats_${userId}`;
    const cached = Array.from(this.verificationCache.values())
      .filter(r => r.userId === userId);

    return {
      totalVerifications: cached.length,
      successRate: cached.filter(r => r.match).length / cached.length,
      averageConfidence: cached.reduce((sum, r) => sum + r.confidence, 0) / cached.length,
      factorPerformance: this.calculateFactorPerformance(cached)
    };
  }

  private calculateFactorPerformance(results: VerificationResult[]): any {
    const factors = ['mfcc', 'pitch', 'formants', 'spectral', 'prosody', 'embedding'];
    const performance: any = {};

    for (const factor of factors) {
      const values = results.map(r => r.factors[factor as keyof typeof r.factors]);
      performance[factor] = {
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        std: this.calculateStd(values)
      };
    }

    return performance;
  }
}

export default VoiceBiometricsService;