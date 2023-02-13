/*
 * *****************************************************************************************************************************
 * Copyright 2019-2020 NXP.
 * NXP Confidential. This software is owned or controlled by NXP and may only be used strictly in accordance with the applicable license terms.
 * By expressly accepting such terms or by downloading, installing, activating and/or otherwise using the software, you are agreeing that you have read, and that you agree to comply with and are bound by, such license terms.
 * If you do not agree to be bound by the applicable license terms, then you may not retain, install, activate or otherwise use the software.
 * ********************************************************************************************************************************
 *
 */

 package com.boltcard.boltcard;

 /**
  * Keys used by the Sample Application are declared here.
  * Created by nxp69547 on 8/3/2016.
  */
 public final class SampleAppKeys {
 
     /**
      * Default key with Value FF.
      */
     public static final byte[] KEY_DEFAULT_FF = {(byte) 0xFF, (byte) 0xFF,
             (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
     /**
      * 16 bytes AES128 Key.
      */
     public static final byte[] KEY_AES128 = {(byte) 0xFF, (byte) 0xFF,
             (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF,
             (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF,
             (byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};
     /**
      * 16 bytes AES128 Key.
      */
     public static final byte[] KEY_AES128_ZEROS = {(byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00};
     /**
      * 24 bytes 2KTDES Key.
      */
     public static final byte[] KEY_2KTDES = {(byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00,
             (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00};
     /**
      * 16 bytes 2KTDES_ULC Key.
      */
     public static final byte[] KEY_2KTDES_ULC = {(byte) 0x49, (byte) 0x45,
             (byte) 0x4D, (byte) 0x4B, (byte) 0x41, (byte) 0x45, (byte) 0x52,
             (byte) 0x42, (byte) 0x21, (byte) 0x4E, (byte) 0x41, (byte) 0x43,
             (byte) 0x55, (byte) 0x4F, (byte) 0x59, (byte) 0x46};
 
     /**
      * Private constructor restricts Implementation.
      */
     private SampleAppKeys() {
 
     }
 
     /**
      * Only these types of Keys can be stored by the Helper class.
      */
     public enum EnumKeyType {
         EnumAESKey,
         EnumDESKey,
         EnumMifareKey
     }
 }
 