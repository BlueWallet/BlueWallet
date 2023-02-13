/*
 * *****************************************************************************************************************************
 * Copyright 2019-2020 NXP.
 * NXP Confidential. This software is owned or controlled by NXP and may only be used strictly in accordance with the applicable license terms.
 * By expressly accepting such terms or by downloading, installing, activating and/or otherwise using the software, you are agreeing that you have read, and that you agree to comply with and are bound by, such license terms.
 * If you do not agree to be bound by the applicable license terms, then you may not retain, install, activate or otherwise use the software.
 * ********************************************************************************************************************************
 *
 */


package io.bluewallet.bluewallet;

import android.content.Context;

import com.nxp.nfclib.defaultimpl.KeyData;
import com.nxp.nfclib.interfaces.IKeyData;
import io.bluewallet.bluewallet.SampleAppKeys.EnumKeyType;

import java.security.Key;

/**
 * KeyInfoProvider is used to store and retrieve the keys required by the sample application.
 * Created by NXP on 7/25/2016.
 */

public class KeyInfoProvider {

    private static KeyInfoProvider mSelf = null;
    /**
     * We shall be using Spongy Castle(Bouncy Castle for Android) to securely store and retrieve
     * keys used in the application.
     *
     * @see SpongyCastleKeystoreHelper
     */
    private SpongyCastleKeystoreHelper mKeystoreHelper;

    /**
     * Private Constructor.
     */
    private KeyInfoProvider(Context context) {

        /*
          Necessary step to use provider of Spongy Castle.
         */
        SpongyCastleKeystoreHelper.initProvider();

        /*
          Initialize the Keystore helper that helps store and retrieve keys
         */
        mKeystoreHelper = new SpongyCastleKeystoreHelper(context);
    }

    /**
     * Returns Singleton instance of KeyInfoProvider.
     *
     * @return KeyInfoProvider
     */
    public synchronized static KeyInfoProvider getInstance(Context context) {
        if (mSelf == null) {
            mSelf = new KeyInfoProvider(context);
        }
        return mSelf;
    }


    /**
     * Stores the Key to the underlying Keystore.
     */
    public void setKey(final String alias, final EnumKeyType keyType, final byte[] key) {
        if (alias != null && key != null) {
            mKeystoreHelper.storeKey(key, alias, keyType);
        }
    }


    /**
     * Retrieves the Key data from Underlying Keystore.
     *
     * @return IKeyData
     */
    public IKeyData getKey(final String alias, final EnumKeyType keyType) {
        /*
          MIFARE Keys are custom keys, they are not supported by SpongyCastle based keystore and
          hence cannot be retrieved from SpongyCastle Keystore without compromising the key
          material.
          You can use the  method getMifareKey() to fetch Mifare Key bytes.
         */
        if (keyType == EnumKeyType.EnumMifareKey) {
            return null;
        }

        Key storedKey = mKeystoreHelper.getKey(alias);
        if (storedKey != null) {
            KeyData keyDataObj = new KeyData();
            keyDataObj.setKey(storedKey);
            return keyDataObj;
        }
        return null;
    }


    /**
     * Returns the bytes of Mifare type key.
     *
     * @return byte[]
     */
    public byte[] getMifareKey(final String alias) {
        return mKeystoreHelper.getMifareKey(alias);
        //MIFARE Keys are custom keys, they are not supported by SpongyCastle based keystore and
        // hence cannot be retrieved from SpongyCastle Keystore without compromising the key
        // material.
    }
}
