/*
 * *****************************************************************************************************************************
 * Copyright 2013-2020 NXP.
 * NXP Confidential. This software is owned or controlled by NXP and may only be used strictly in accordance with the applicable license terms.
 * By expressly accepting such terms or by downloading, installing, activating and/or otherwise using the software, you are agreeing that you have read, and that you agree to comply with and are bound by, such license terms.
 * If you do not agree to be bound by the applicable license terms, then you may not retain, install, activate or otherwise use the software.
 * ********************************************************************************************************************************
 *
 */


 package io.bluewallet.bluewallet;

 import com.nxp.nfclib.interfaces.IKeyData;
 
 import javax.crypto.Cipher;
 import javax.crypto.spec.IvParameterSpec;
 
 
 /**
  * MainActivity has the business logic to initialize the taplinx library and use it for
  * identification of the cards
  */
 public class Constants {
     /**
      * String Constants
      */
     static final String TAG = "lightningnfcapp";
     static final String ALIAS_KEY_AES128 = "key_aes_128";
     static final String ALIAS_KEY_2KTDES = "key_2ktdes";
     static final String ALIAS_KEY_2KTDES_ULC = "key_2ktdes_ulc";
     static final String ALIAS_DEFAULT_FF = "alias_default_ff";
     static final String ALIAS_KEY_AES128_ZEROES = "alias_default_00";
     static final String EXTRA_KEYS_STORED_FLAG = "keys_stored_flag";
 
     /**
      * KEY_APP_MASTER key used for encrypting the data.
      */
     static final String KEY_APP_MASTER = "This is my key  ";
 
     /**
      * Constant for permission
      */
     static final int STORAGE_PERMISSION_WRITE = 113;
     static final String UNABLE_TO_READ = "Unable to read";
     static final char TOAST_PRINT = 'd';
     static final char TOAST = 't';
     static final char PRINT = 'n';
     static final String EMPTY_SPACE = " ";
     /**
      * Package Key.
      * Package Key : Now goes in the .env file in the project root
      */
 
 
     static IKeyData objKEY_2KTDES_ULC = null;
     static IKeyData objKEY_2KTDES = null;
     static IKeyData objKEY_AES128 = null;
     static byte[] default_ff_key = null;
     static IKeyData default_zeroes_key = null;
 
     /**
      * Classic sector number set to 6.
      */
     static final int DEFAULT_SECTOR_CLASSIC = 6;
 
     static final byte DEFAULT_ICode_PAGE = (byte) 0x10;
 
     /**
      * bytes key.
      */
     static byte[] bytesKey = null;
     /**
      * Cipher instance.
      */
     static Cipher cipher = null;
     /**
      * Iv.
      */
     static IvParameterSpec iv = null;
 
     //16 byte Default AES Key
     static final byte[] KEY_AES128_DEFAULT =
             {(byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
                     (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00,
                     (byte) 0x00, (byte) 0x00, (byte) 0x00, (byte) 0x00};
 }
 