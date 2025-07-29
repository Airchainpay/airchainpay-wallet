import { Platform } from 'react-native';
import { logger } from '../utils/Logger';
import { BLEPaymentPayload } from './BluetoothManager';

/**
 * BLE Advertising Enhancements
 * Handles enhanced advertising features for offline BLE communication
 */

export interface AdvertisingConfig {
  deviceName: string;
  serviceUUID: string;
  manufacturerData: number[];
  txPowerLevel: number;
  advertiseMode: number;
  includeDeviceName: boolean;
  includeTxPowerLevel: boolean;
  connectable: boolean;
  timeout?: number;
  interval?: number;
  payload?: BLEPaymentPayload;
}

export interface AdvertisingMetrics {
  startTime: number;
  stopTime?: number;
  duration: number;
  success: boolean;
  errorCount: number;
  restartCount: number;
  payloadTransmitted?: boolean;
}

interface Advertiser {
  startBroadcast: (data: string) => Promise<boolean>;
  stopBroadcast: () => Promise<boolean>;
  isAdvertising: boolean;
  [key: string]: unknown;
}

export class BLEAdvertisingEnhancements {
  private static instance: BLEAdvertisingEnhancements | null = null;
  private metrics: Map<string, AdvertisingMetrics> = new Map();
  private restartAttempts: Map<string, number> = new Map();
  private maxRestartAttempts = 3;
  private restartDelay = 2000; // 2 seconds

  private constructor() {}

  public static getInstance(): BLEAdvertisingEnhancements {
    if (!BLEAdvertisingEnhancements.instance) {
      BLEAdvertisingEnhancements.instance = new BLEAdvertisingEnhancements();
    }
    return BLEAdvertisingEnhancements.instance;
  }

  /**
   * Create advertising configuration optimized for payment payload
   */
  createPaymentAdvertisingConfig(
    deviceName: string, 
    serviceUUID: string,
    payload: BLEPaymentPayload
  ): AdvertisingConfig {
    return {
      deviceName,
      serviceUUID,
      manufacturerData: Buffer.from(JSON.stringify(payload), 'utf8').toJSON().data,
      txPowerLevel: -12, // Typical BLE power level
      advertiseMode: 0, // ADVERTISE_MODE_BALANCED
      includeDeviceName: true,
      includeTxPowerLevel: true,
      connectable: true,
      timeout: 60000, // 60 seconds auto-stop
      interval: 100, // 100ms advertising interval for faster discovery
      payload
    };
  }

  /**
   * Create basic advertising configuration
   */
  createAdvertisingConfig(deviceName: string, serviceUUID: string): AdvertisingConfig {
    return {
      deviceName,
      serviceUUID,
      manufacturerData: Buffer.from('AirChainPay', 'utf8').toJSON().data,
      txPowerLevel: -12, // Typical BLE power level
      advertiseMode: 0, // ADVERTISE_MODE_BALANCED
      includeDeviceName: true,
      includeTxPowerLevel: true,
      connectable: true,
      timeout: 0, // Advertise indefinitely
      interval: 100 // 100ms advertising interval
    };
  }

  /**
   * Validate advertising configuration
   */
  validateAdvertisingConfig(config: AdvertisingConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.deviceName || config.deviceName.length === 0) {
      errors.push('Device name is required');
    }

    if (!config.serviceUUID || config.serviceUUID.length === 0) {
      errors.push('Service UUID is required');
    }

    if (!this.isValidUUID(config.serviceUUID)) {
      errors.push('Invalid service UUID format');
    }

    if (config.txPowerLevel < -30 || config.txPowerLevel > 10) {
      errors.push('TX power level must be between -30 and 10 dBm');
    }

    if (config.advertiseMode < 0 || config.advertiseMode > 2) {
      errors.push('Advertise mode must be 0, 1, or 2');
    }

    if (config.interval && (config.interval < 20 || config.interval > 10240)) {
      errors.push('Advertising interval must be between 20ms and 10240ms');
    }

    // Validate payload if present
    if (config.payload) {
      if (!config.payload.walletAddress) {
        errors.push('Payload wallet address is required');
      }
      if (!config.payload.timestamp) {
        errors.push('Payload timestamp is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Start advertising with payment payload using tp-rn-ble-advertiser
   */
  async startPaymentAdvertising(
    advertiser: Advertiser,
    payload: BLEPaymentPayload,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Check platform support
      if (Platform.OS !== 'android') {
        const error = 'BLE advertising is only supported on Android';
        this.recordMetrics(sessionId, startTime, false, error);
        return { success: false, error };
      }

      // Create advertising message
      const advertisingMessage = JSON.stringify(payload);
      
      // Start advertising using tp-rn-ble-advertiser
      const result = await advertiser.startBroadcast(advertisingMessage);
      
      if (result) {
        this.recordMetrics(sessionId, startTime, true, undefined, true);
        logger.info('[BLE] Payment advertising started successfully', { sessionId, payload });
        return { success: true };
      } else {
        const error = 'Failed to start advertising - no result from startBroadcast';
        this.recordMetrics(sessionId, startTime, false, error);
        return { success: false, error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordMetrics(sessionId, startTime, false, errorMessage);
      logger.error('[BLE] Payment advertising failed', { sessionId, error: errorMessage });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Start advertising with enhanced error handling and metrics
   */
  async startAdvertisingWithEnhancements(
    advertiser: Advertiser,
    config: AdvertisingConfig,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      const validation = this.validateAdvertisingConfig(config);
      if (!validation.valid) {
        const error = `Invalid advertising configuration: ${validation.errors.join(', ')}`;
        this.recordMetrics(sessionId, startTime, false, error);
        return { success: false, error };
      }

      // Check platform support
      if (Platform.OS !== 'android') {
        const error = 'BLE advertising is only supported on Android';
        this.recordMetrics(sessionId, startTime, false, error);
        return { success: false, error };
      }

      // Create advertising message
      let advertisingMessage: string;
      if (config.payload) {
        advertisingMessage = JSON.stringify(config.payload);
      } else {
        advertisingMessage = JSON.stringify({
          name: config.deviceName,
          serviceUUID: config.serviceUUID,
          type: 'AirChainPay',
          version: '1.0.0',
          timestamp: Date.now()
        });
      }

      // Start advertising using tp-rn-ble-advertiser
      const result = await advertiser.startBroadcast(advertisingMessage);
      
      if (result) {
        this.recordMetrics(sessionId, startTime, true, undefined, !!config.payload);
        logger.info('[BLE] Enhanced advertising started successfully', { sessionId, config });
        return { success: true };
      } else {
        const error = 'Failed to start advertising - no result from startBroadcast';
        this.recordMetrics(sessionId, startTime, false, error);
        return { success: false, error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordMetrics(sessionId, startTime, false, errorMessage);
      logger.error('[BLE] Enhanced advertising failed', { sessionId, error: errorMessage });
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Stop advertising with cleanup
   */
  async stopAdvertisingWithEnhancements(
    advertiser: Advertiser,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await advertiser.stopBroadcast();
      
      // Update metrics
      const metrics = this.metrics.get(sessionId);
      if (metrics) {
        metrics.stopTime = Date.now();
        metrics.duration = metrics.stopTime - metrics.startTime;
      }

      // Clean up restart attempts
      this.restartAttempts.delete(sessionId);
      
      logger.info('[BLE] Enhanced advertising stopped successfully', { sessionId });
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[BLE] Enhanced advertising stop failed', { sessionId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Auto-restart advertising if it fails
   */
  async restartAdvertisingIfNeeded(
    advertiser: Advertiser,
    config: AdvertisingConfig,
    sessionId: string
  ): Promise<boolean> {
    const attempts = this.restartAttempts.get(sessionId) || 0;
    
    if (attempts >= this.maxRestartAttempts) {
      logger.warn('[BLE] Max restart attempts reached', { sessionId, attempts });
      return false;
    }

    this.restartAttempts.set(sessionId, attempts + 1);
    
    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, this.restartDelay));
    
    logger.info('[BLE] Attempting to restart advertising', { sessionId, attempt: attempts + 1 });
    
    const result = await this.startAdvertisingWithEnhancements(advertiser, config, sessionId);
    
    if (result.success) {
      const metrics = this.metrics.get(sessionId);
      if (metrics) {
        metrics.restartCount++;
      }
    }
    
    return result.success;
  }

  /**
   * Get advertising metrics
   */
  getAdvertisingMetrics(sessionId: string): AdvertisingMetrics | undefined {
    return this.metrics.get(sessionId);
  }

  /**
   * Get all advertising metrics
   */
  getAllAdvertisingMetrics(): Map<string, AdvertisingMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics for a session
   */
  clearMetrics(sessionId: string): void {
    this.metrics.delete(sessionId);
    this.restartAttempts.delete(sessionId);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.clear();
    this.restartAttempts.clear();
  }

  /**
   * Get advertising statistics
   */
  getAdvertisingStatistics(): {
    totalSessions: number;
    successfulSessions: number;
    failedSessions: number;
    averageDuration: number;
    totalRestarts: number;
    payloadTransmissions: number;
  } {
    const sessions = Array.from(this.metrics.values());
    const successfulSessions = sessions.filter(s => s.success);
    const failedSessions = sessions.filter(s => !s.success);
    const totalRestarts = sessions.reduce((sum, s) => sum + s.restartCount, 0);
    const payloadTransmissions = sessions.filter(s => s.payloadTransmitted).length;
    const averageDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
      : 0;

    return {
      totalSessions: sessions.length,
      successfulSessions: successfulSessions.length,
      failedSessions: failedSessions.length,
      averageDuration,
      totalRestarts,
      payloadTransmissions
    };
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Record advertising metrics
   */
  private recordMetrics(
    sessionId: string, 
    startTime: number, 
    success: boolean, 
    error?: string,
    payloadTransmitted?: boolean
  ): void {
    const metrics: AdvertisingMetrics = {
      startTime,
      success,
      errorCount: error ? 1 : 0,
      restartCount: 0,
      duration: 0,
      payloadTransmitted
    };

    this.metrics.set(sessionId, metrics);
  }
} 