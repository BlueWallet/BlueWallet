package io.bluewallet.bluewallet;

import static io.bluewallet.bluewallet.Constants.ALIAS_DEFAULT_FF;
import static io.bluewallet.bluewallet.Constants.ALIAS_KEY_2KTDES;
import static io.bluewallet.bluewallet.Constants.ALIAS_KEY_2KTDES_ULC;
import static io.bluewallet.bluewallet.Constants.ALIAS_KEY_AES128;
import static io.bluewallet.bluewallet.Constants.ALIAS_KEY_AES128_ZEROES;
import static io.bluewallet.bluewallet.Constants.EMPTY_SPACE;
import static io.bluewallet.bluewallet.Constants.EXTRA_KEYS_STORED_FLAG;
import static io.bluewallet.bluewallet.Constants.KEY_AES128_DEFAULT;
import static io.bluewallet.bluewallet.Constants.KEY_APP_MASTER;
import static io.bluewallet.bluewallet.Constants.PRINT;
import static io.bluewallet.bluewallet.Constants.STORAGE_PERMISSION_WRITE;
import static io.bluewallet.bluewallet.Constants.TAG;
import static io.bluewallet.bluewallet.Constants.TOAST;
import static io.bluewallet.bluewallet.Constants.TOAST_PRINT;
import static io.bluewallet.bluewallet.Constants.bytesKey;
import static io.bluewallet.bluewallet.Constants.cipher;
import static io.bluewallet.bluewallet.Constants.default_ff_key;
import static io.bluewallet.bluewallet.Constants.default_zeroes_key;
import static io.bluewallet.bluewallet.Constants.iv;
import static io.bluewallet.bluewallet.Constants.objKEY_2KTDES;
import static io.bluewallet.bluewallet.Constants.objKEY_2KTDES_ULC;
import static io.bluewallet.bluewallet.Constants.objKEY_AES128;

import io.bluewallet.bluewallet.R;
import com.nxp.nfclib.CardType;
import com.nxp.nfclib.NxpNfcLib;
import com.nxp.nfclib.classic.ClassicFactory;
import com.nxp.nfclib.defaultimpl.KeyData;
import com.nxp.nfclib.desfire.IDESFireEV2;
import com.nxp.nfclib.desfire.IDESFireEV3;
import com.nxp.nfclib.desfire.IDESFireEV3C;
import com.nxp.nfclib.desfire.IDESFireLight;
import com.nxp.nfclib.desfire.IMIFAREIdentity;
import com.nxp.nfclib.exceptions.NxpNfcLibException;
import com.nxp.nfclib.icode.ICodeFactory;
import com.nxp.nfclib.ntag.NTagFactory;
import com.nxp.nfclib.plus.IPlus;
import com.nxp.nfclib.plus.IPlusEV1SL0;
import com.nxp.nfclib.plus.IPlusEV1SL1;
import com.nxp.nfclib.plus.IPlusEV1SL3;
import com.nxp.nfclib.plus.IPlusSL0;
import com.nxp.nfclib.plus.IPlusSL1;
import com.nxp.nfclib.plus.IPlusSL3;
import com.nxp.nfclib.plus.PlusFactory;
import com.nxp.nfclib.plus.PlusSL1Factory;
import com.nxp.nfclib.ultralight.UltralightFactory;
import com.nxp.nfclib.utils.NxpLogUtils;
import com.nxp.nfclib.utils.Utilities;
import com.nxp.nfclib.ndef.INdefMessage;
import com.nxp.nfclib.ndef.NdefMessageWrapper;
import com.nxp.nfclib.ndef.NdefRecordWrapper;
import com.nxp.nfclib.exceptions.UsageException;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.security.Key;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.List;
import java.util.ArrayList;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.Charset;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.codec.binary.Hex;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Point;
import android.graphics.Typeface;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.MifareClassic;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.PersistableBundle;
import android.preference.PreferenceManager;
import android.text.Html;
import android.text.method.ScrollingMovementMethod;
import android.util.Log;
import android.view.Display;
import android.view.Gravity;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AnimationUtils;
import android.view.KeyEvent;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.GCMParameterSpec;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.PackageList;
import com.facebook.react.ReactPackage;
import com.facebook.react.common.LifecycleState;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactContext;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import org.bouncycastle.crypto.engines.AESEngine;
import org.bouncycastle.crypto.macs.CMac;
import org.bouncycastle.crypto.BlockCipher;
import org.bouncycastle.crypto.CipherParameters;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.crypto.engines.AESFastEngine;
import org.bouncycastle.crypto.Mac;

import java.util.HashMap;
import java.util.Map;
import com.google.common.collect.ImmutableMap;

public class MainActivity extends ReactActivity {

    /**
    * NxpNfclib instance.
    */
    private NxpNfcLib libInstance = null;

    private final StringBuilder stringBuilder = new StringBuilder();

    private ReactRootView mReactRootView; //change
    private ReactInstanceManager mReactInstanceManager;

    private final String CARD_MODE_READ = "read";
    private final String CARD_MODE_WRITE = "write";
    private final String CARD_MODE_WRITEKEYS = "writekeys";
    private final String CARD_MODE_RESETKEYS = "resetkeys";
    private final String CARD_MODE_CREATEBOLTCARD = "createBoltcard";
    
    private String cardmode = CARD_MODE_READ;
    private String lnurlw_base = "";
    private String packageKey = BuildConfig.MIFARE_KEY;

    private byte[] key0;
    private byte[] key1;
    private byte[] key2;
    private byte[] key3;
    private byte[] key4;

    private String[] resetKeys;
    private String uid;

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "BlueWallet";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(null);
        if (getResources().getBoolean(R.bool.portrait_only)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
        mReactRootView = new ReactRootView(this);
        List<ReactPackage> packages = new PackageList(getApplication()).getPackages();
        mReactInstanceManager = ReactInstanceManager.builder()
                    .setApplication(getApplication())
                    .setCurrentActivity(this)
                    .setBundleAssetName("index.android.bundle")
                    .setJSMainModulePath("index")
                    .addPackages(packages)
                    .setUseDeveloperSupport(BuildConfig.DEBUG)
                    .setInitialLifecycleState(LifecycleState.RESUMED)
                    .build();
        // The string here (e.g. "MyReactNativeApp") has to match
        // the string in AppRegistry.registerComponent() in index.js
        Bundle initialProperties = new Bundle();
        mReactRootView.startReactApplication(mReactInstanceManager, "main", initialProperties);

        boolean readPermission = (ContextCompat.checkSelfPermission(MainActivity.this,
                Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED);

        if (!readPermission) {
            ActivityCompat.requestPermissions(MainActivity.this,
                    new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE},
                    STORAGE_PERMISSION_WRITE
            );
        }

        /* Initialize the library and register to this activity */
        initializeLibrary();

        initializeKeys();

        /* Initialize the Cipher and init vector of 16 bytes with 0xCD */
        initializeCipherinitVector();
    }

    /**
   * Initialize the library and register to this activity.
   */
  private void initializeLibrary() {
      libInstance = NxpNfcLib.getInstance();
      try {
          libInstance.registerActivity(this, packageKey);
      } catch (NxpNfcLibException ex) {
          showMessage(ex.getMessage(), TOAST);
      } catch (Exception e) {
          // do nothing added to handle the crash if any
          showMessage(e.getMessage(), TOAST);
      }
  }

  private void initializeKeys() {
    KeyInfoProvider infoProvider = KeyInfoProvider.getInstance(getApplicationContext());

    SharedPreferences sharedPrefs = getPreferences(Context.MODE_PRIVATE);
    boolean keysStoredFlag = sharedPrefs.getBoolean(EXTRA_KEYS_STORED_FLAG, false);
    if (!keysStoredFlag) {
        //Set Key stores the key in persistent storage, this method can be called only once
        // if key for a given alias does not change.
        byte[] ulc24Keys = new byte[24];
        System.arraycopy(SampleAppKeys.KEY_2KTDES_ULC, 0, ulc24Keys, 0, SampleAppKeys.KEY_2KTDES_ULC.length);
        System.arraycopy(SampleAppKeys.KEY_2KTDES_ULC, 0, ulc24Keys, SampleAppKeys.KEY_2KTDES_ULC.length, 8);
        infoProvider.setKey(ALIAS_KEY_2KTDES_ULC, SampleAppKeys.EnumKeyType.EnumDESKey, ulc24Keys);

        infoProvider.setKey(ALIAS_KEY_2KTDES, SampleAppKeys.EnumKeyType.EnumDESKey, SampleAppKeys.KEY_2KTDES);
        infoProvider.setKey(ALIAS_KEY_AES128, SampleAppKeys.EnumKeyType.EnumAESKey, SampleAppKeys.KEY_AES128);
        infoProvider.setKey(ALIAS_KEY_AES128_ZEROES, SampleAppKeys.EnumKeyType.EnumAESKey, SampleAppKeys.KEY_AES128_ZEROS);
        infoProvider.setKey(ALIAS_DEFAULT_FF, SampleAppKeys.EnumKeyType.EnumMifareKey, SampleAppKeys.KEY_DEFAULT_FF);

        sharedPrefs.edit().putBoolean(EXTRA_KEYS_STORED_FLAG, true).apply();
        //If you want to store a new key after key initialization above, kindly reset the
        // flag EXTRA_KEYS_STORED_FLAG to false in shared preferences.
    }
    try {

        objKEY_2KTDES_ULC = infoProvider.getKey(ALIAS_KEY_2KTDES_ULC, SampleAppKeys.EnumKeyType.EnumDESKey);
        objKEY_2KTDES = infoProvider.getKey(ALIAS_KEY_2KTDES, SampleAppKeys.EnumKeyType.EnumDESKey);
        objKEY_AES128 = infoProvider.getKey(ALIAS_KEY_AES128, SampleAppKeys.EnumKeyType.EnumAESKey);
        default_zeroes_key = infoProvider.getKey(ALIAS_KEY_AES128_ZEROES, SampleAppKeys.EnumKeyType.EnumAESKey);
        default_ff_key = infoProvider.getMifareKey(ALIAS_DEFAULT_FF);
    } catch (Exception e) {
        ((ActivityManager) Objects.requireNonNull(MainActivity.this.getSystemService(ACTIVITY_SERVICE))).clearApplicationUserData();
    }
  }

  
  /**
   * Initialize the Cipher and init vector of 16 bytes with 0xCD.
   */
  private void initializeCipherinitVector() {
    /* Initialize the Cipher */
    try {
        cipher = Cipher.getInstance("AES/CBC/NoPadding");
    } catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
        e.printStackTrace();
    }
    /* set Application Master Key */
    bytesKey = KEY_APP_MASTER.getBytes();

    /* Initialize init vector of 16 bytes with 0xCD. It could be anything */
    byte[] ivSpec = new byte[16];
    Arrays.fill(ivSpec, (byte) 0xCD);
    iv = new IvParameterSpec(ivSpec);
  }

  /**
   * (non-Javadoc).
   *
   * @param intent NFC intent from the android framework.
   * // @see android.app.Activity#onNewIntent(android.content.Intent)
   */
  @Override
  public void onNewIntent(final Intent intent) {
    // Log.w(TAG, "onNewIntent() action:"+intent.getAction());
    //if intent is not an NDEF discovery then do super and return;
    if (!intent.getAction().equals("android.nfc.action.NDEF_DISCOVERED") && !intent.getAction().equals("android.nfc.action.TAG_DISCOVERED")) {
      super.onNewIntent(intent);
    }
    else {
      try {
        CardType type = libInstance.getCardType(intent); //Get the type of the card
        if (type == CardType.UnknownCard) {
          showMessage(getString(R.string.UNKNOWN_TAG), PRINT);
          throw new Exception("Unknown Tag. Maybe try again?");
        }
        else if (type != CardType.NTAG424DNA && type != CardType.NTAG424DNATagTamper) {
          showMessage("NFC Card must be of type NTAG424DNA or NTAG424DNATT", PRINT);
          throw new Exception("NFC Card must be of type  NTAG424DNA or NTAG424DNATT");
        }
        BoltCardWrapper boltCardWrapper = new BoltCardWrapper(libInstance, type);

        byte[] NTAG424DNA_APP_NAME = {(byte) 0xD2, (byte) 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01};
        boltCardWrapper.isoSelectApplicationByDFName(NTAG424DNA_APP_NAME);
        
        if(this.cardmode.equals(CARD_MODE_WRITE)) {
          writeCard(boltCardWrapper);
        }
        else if(this.cardmode.equals(CARD_MODE_WRITEKEYS)) {
          writeKeys(boltCardWrapper);
        }
        else if(this.cardmode.equals(CARD_MODE_RESETKEYS)) {
          doresetKeys(boltCardWrapper);
        }
        else if(this.cardmode.equals(CARD_MODE_CREATEBOLTCARD)) {
          createBoltCard(boltCardWrapper);
        }
        else { //this.cardmode == CARD_MODE_READ, or if in doubt, just read the card
          readCard(boltCardWrapper);
        }
        super.onNewIntent(intent);
      } 
      catch (Exception e) {
        Log.e(TAG, "Some exception occurred", e);
        if(e instanceof UsageException && e.getMessage() == "BytesToRead should be greater than 0") {
          WritableMap params = Arguments.createMap();
          params.putString("message", "This NFC card has not been formatted.");
          sendEvent("NFCError", params);
        }
        else {
          WritableMap params = Arguments.createMap();
          params.putString("message", "Error: "+e.getMessage());
          sendEvent("NFCError", params);
        }
      }
    }
    
  }

  /**
   * Authenticates with the change key (key 0) and checks the card is the correct type and format.
   * @param intent
   * @return
   */
  public BoltCardWrapper authenticateWithDefaultChangeKey(BoltCardWrapper boltCardWrapper) throws Exception {
    KeyData aesKeyData = new KeyData();
    Key keyDefault = new SecretKeySpec(KEY_AES128_DEFAULT, "AES");
    aesKeyData.setKey(keyDefault);
    boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
    return boltCardWrapper;
  }

  /**
   * Completely create a boltcard using the preset keys and lnurlw
   * 
   * @param boltCardWrapper
   * @throws Exception
   */
  private void createBoltCard(BoltCardWrapper boltCardWrapper) throws Exception{
    String tagname = boltCardWrapper.getType().getTagName() + boltCardWrapper.getType().getDescription();
    String UID = Utilities.dumpBytes(boltCardWrapper.getUID());
    sendEvent("CreateBoltCard",new HashMap<String, String>() {{
      put("tagname", tagname);
      put("cardUID", UID.substring(2));
    }});
    
    String [] keyChecks = checkKeys(boltCardWrapper);
    sendEvent("CreateBoltCard",new HashMap<String, String>() {{
      put("key0Changed", keyChecks[0]);
      put("key1Changed", keyChecks[1]);
      put("key2Changed", keyChecks[2]);
      put("key3Changed", keyChecks[3]);
      put("key4Changed", keyChecks[4]);
    }});

    //write the NDEF and the file settings
    try {
      this.authenticateWithDefaultChangeKey(boltCardWrapper);
      this.writeNDEF(boltCardWrapper);
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("ndefWritten", "success");
      }});
    }
    catch(Exception e) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("ndefWritten", e.getMessage());
      }});  
      Log.e(TAG, "ndefWritten Error "+e.getMessage());
      throw e;
    }

    //write the keys to the card
    try {
      this.writeKeys(boltCardWrapper);
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("writekeys", "success");
      }});
    }
    catch(Exception e) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("writekeys", e.getMessage());
      }});  
      Log.e(TAG, "writekeys Error"+e.getMessage());
      return;
    }

    //finally get the read message from the card and pass to the server, so the
    //server can set the current counter value and card UID
    try {
      INdefMessage ndefRead = boltCardWrapper.readNDEF();
      String bolturl = this.decodeHex(ndefRead.toByteArray()).substring(5);

      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("readNDEF", bolturl);
      }});
    }
    catch(Exception e) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("readNDEF", "Error: "+e.getMessage());
      }});  
      Log.e(TAG, "ndefRead Error"+e.getMessage());
      return;
    }

    this.testPandCvalues(boltCardWrapper);
    
  }

  public void testPandCvalues(BoltCardWrapper boltCardWrapper) throws Exception{
    String ptest = "ok";
    String ctest = "ok";
    String UID = Utilities.dumpBytes(boltCardWrapper.getUID());
    INdefMessage ndefRead = boltCardWrapper.readNDEF();
    String bolturl = ndefRead.toByteArray().length > 5 ? this.decodeHex(ndefRead.toByteArray()).substring(5) : "";
    if(bolturl.equals("")) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("testp", "no p value to test");
        put("testc", "no c value to test");
      }});
      return;
    }
    if(bolturl.indexOf("p=")==-1) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("testp", "no p value to test");
      }});
      return;
    }
    if(bolturl.indexOf("c=")==-1) {
      sendEvent("CreateBoltCard",new HashMap<String, String>() {{
        put("testp", "no p value to test");
      }});
      return;
    }
      
    //check PICC encryption to test key1
    String pParam = bolturl.split("p=")[1].substring(0, 32);
    String pDecrypt = this.decrypt(this.hexStringToByteArray(pParam));
    String UIDwithout0x = UID.substring(2);
    ptest = pDecrypt.startsWith("0xC7"+UIDwithout0x) ? "ok" : "decrypt with key failed";
    final String pResult = ptest;
    sendEvent("CreateBoltCard",new HashMap<String, String>() {{
      put("testp", pResult);
    }});
    String sv2string = "3CC300010080"+pDecrypt.substring(4,24);
    byte[] sv2 = this.hexStringToByteArray(sv2string);

    int cmacPos = bolturl.indexOf("c=")+7;
    byte[] msg = sv2; //Arrays.copyOfRange(ndefRead.toByteArray(), 0, cmacPos-1);
    
    //Check CMAC to test key2
    try {
      String cParam = bolturl.split("c=")[1].substring(0, 16);
      int cmacSize = 16;
      BlockCipher cipher = new AESFastEngine();
      Mac cmac = new CMac(cipher, cmacSize * 8);
      KeyParameter keyParameter = new KeyParameter(key2);
      cmac.init(keyParameter);
      cmac.update(msg, 0, msg.length);
      byte[] CMAC = new byte[cmacSize];
      cmac.doFinal(CMAC, 0);

      int cmacSize1 = 16;
      BlockCipher cipher1 = new AESFastEngine();
      Mac cmac1 = new CMac(cipher1, cmacSize1 * 8);
      KeyParameter keyParameter1 = new KeyParameter(CMAC);
      cmac.init(keyParameter1);
      cmac.update(new byte[0], 0, 0);
      byte[] CMAC1 = new byte[cmacSize1];
      cmac.doFinal(CMAC1, 0);

      byte[] MFCMAC = new byte[cmacSize / 2];

      int j = 0;
      for (int i = 0; i < CMAC1.length; i++) {
        if (i % 2 != 0) {
          MFCMAC[j] = CMAC1[i];
          j += 1;
        }
      }

      ctest = Utilities.dumpBytes(MFCMAC).equals("0x"+cParam) ? "ok" : "decrypt with key failed";

    } catch (Exception ex) {
      ctest = ex.getMessage();
    }
    final String cResult = ctest;
    sendEvent("CreateBoltCard",new HashMap<String, String>() {{
      put("testc", cResult);
    }});
  }

  /**
   * Reads the NFC card unauthenticated and dumps the first NDEF message along with other
   * interesting info.
   * 
   * @param intent
   * @throws Exception
   */
  private void readCard(BoltCardWrapper boltCardWrapper) throws Exception{

    String tagname = boltCardWrapper.getType().getTagName() + boltCardWrapper.getType().getDescription();
    String UID = Utilities.dumpBytes(boltCardWrapper.getUID());
    int totalMem = boltCardWrapper.getTotalMemory();
    byte[] getVersion = boltCardWrapper.getVersion();
    String vendor = (getVersion[0] == (byte) 0x04) ? "NXP" : "Non NXP"; 
    
    String cardDataBuilder = "Tagname: "+tagname+"\r\n"+
      "UID: "+UID+"\r\n"+
      "TotalMem: "+totalMem+"\r\n"+
      "Vendor: "+vendor+"\r\n";

    INdefMessage ndefRead = boltCardWrapper.readNDEF();
    String bolturl = ndefRead.toByteArray().length > 5 ? this.decodeHex(ndefRead.toByteArray()).substring(5) : "";
    if(bolturl.indexOf("p=")==-1 || bolturl.indexOf("c=")==-1) {
      WritableMap params = Arguments.createMap();
      params.putString("cardReadInfo", cardDataBuilder);
      params.putString("ndef", bolturl);
      params.putString("cardUID", UID.substring(2));
      sendEvent("CardHasBeenRead", params);
    }
    else {

      String [] keyChecks = checkKeys(boltCardWrapper);

      WritableMap params = Arguments.createMap();
      params.putString("tagname", tagname);
      params.putString("cardReadInfo", cardDataBuilder);
      params.putString("ndef", bolturl);
      params.putString("key0Changed", keyChecks[0]);
      params.putString("key1Changed", keyChecks[1]);
      params.putString("key2Changed", keyChecks[2]);
      params.putString("key3Changed", keyChecks[3]);
      params.putString("key4Changed", keyChecks[4]);
      params.putString("cardUID", UID.substring(2));
      sendEvent("CardHasBeenRead", params);
    }
    
  }

  public String[] checkKeys(BoltCardWrapper boltCardWrapper) throws Exception {
   
    KeyData aesKeyData = new KeyData();
    Key keyDefault = new SecretKeySpec(KEY_AES128_DEFAULT, "AES");
    aesKeyData.setKey(keyDefault);

    // String UID = Utilities.dumpBytes(boltCardWrapper.getUID());
    
    //Check if auth works to see if key0 is zero.
    String key0Changed = "unsure";
    String key1Changed = "unsure";
    String key2Changed = "unsure";
    String key3Changed = "unsure";
    String key4Changed = "unsure";

    try {
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      key0Changed="no";
    }
    catch(Exception e) {
      key0Changed="yes";
    }

    try {
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(1, KEY_AES128_DEFAULT, KEY_AES128_DEFAULT, (byte) 0);
      key1Changed="no";
    }
    catch(Exception e) {
      key1Changed = "yes";
    }

    try {
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(2, KEY_AES128_DEFAULT, KEY_AES128_DEFAULT, (byte) 0);
      key2Changed="no";
    }
    catch(Exception e) {
      key2Changed = "yes";
    }
    

    //try to change key 3 and 4 from default key to default key
    try {
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(3, KEY_AES128_DEFAULT, KEY_AES128_DEFAULT, (byte) 0);
      key3Changed="no";
    }
    catch(Exception e) {
      key3Changed = "yes";
    }

    try {
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(4, KEY_AES128_DEFAULT, KEY_AES128_DEFAULT, (byte) 0);
      key4Changed="no";
    }
    catch(Exception e) {
      key4Changed = "yes";
    }

    return new String[]{key0Changed, key1Changed, key2Changed, key3Changed, key4Changed};
  }

  public String decrypt(byte[] encryptedData) throws Exception {
    Cipher decryptionCipher = Cipher.getInstance("AES/CBC/NoPadding");    
    byte[] ivSpec = new byte[16];
    Arrays.fill(ivSpec, (byte) 0x00);
    IvParameterSpec spec = new IvParameterSpec(ivSpec);
    Key keyDefault = new SecretKeySpec(key1, "AES");
    decryptionCipher.init(Cipher.DECRYPT_MODE, keyDefault, spec);
    byte[] decryptedBytes = decryptionCipher.doFinal(encryptedData);
    return Utilities.dumpBytes(decryptedBytes);
  }

  /**
   * Writes the NFC card with the lnurlw:// and domain and path specified, 
   * sets up PICC and MAC mirroring and sets correct PICC and MAC mirror offsets
   * 
   * @param intent
   * @throws Exception
   */
  private void writeCard(BoltCardWrapper boltCardWrapper) throws Exception{
    String result = "success";
    try{
      this.authenticateWithDefaultChangeKey(boltCardWrapper);
      this.writeNDEF(boltCardWrapper);
    }
    catch(Exception e) {
      result = "Error writing card: "+e.getMessage();
      Log.d(TAG, e.getMessage());
    }

    WritableMap params = Arguments.createMap();
    params.putString("output", result);
    sendEvent("WriteResult", params);
  }

  /**
   * Writes the NDEF and sets the File Settings to enable PICC and MAC with correct offsets
   * @param intent
   * @param boltCardWrapper
   * @throws Exception
   */
  private void writeNDEF(BoltCardWrapper boltCardWrapper) throws Exception {
  
    int piccOffset = this.lnurlw_base.length() + 10;
    int macOffset = this.lnurlw_base.length() + 45;
    
    NdefMessageWrapper msg = new NdefMessageWrapper(
      NdefRecordWrapper.createUri(
        this.lnurlw_base.indexOf("?") == -1 ? 
          this.lnurlw_base+"?p=00000000000000000000000000000000&c=0000000000000000"
        :
          this.lnurlw_base+"&p=00000000000000000000000000000000&c=0000000000000000"
      )
    );
    boltCardWrapper.writeNDEF(msg);
    
    this.authenticateWithDefaultChangeKey(boltCardWrapper);
    boltCardWrapper.setAndChangeFileSettings(piccOffset, macOffset);

  }

  /**
   * Write the keys stored in memory to the NFC card (assmumes default zero byte keys)
   * 
   * @param intent
   * @throws Exception
   */
  private void writeKeys(BoltCardWrapper boltCardWrapper) throws Exception{
    String result = "success";
    this.authenticateWithDefaultChangeKey(boltCardWrapper);

    try{

      //changeKey(int keyNumber, byte[] currentKeyData, byte[] newKeyData, byte newKeyVersion)
      int key0newVersion = boltCardWrapper.getKeyVersion(0)+1;
      int key1newVersion = boltCardWrapper.getKeyVersion(1)+1;
      int key2newVersion = boltCardWrapper.getKeyVersion(2)+1;
      int key3newVersion = boltCardWrapper.getKeyVersion(3)+1;
      int key4newVersion = boltCardWrapper.getKeyVersion(4)+1;

      //set up the default key
      KeyData aesKeyData = new KeyData();
      Key keyDefault = new SecretKeySpec(KEY_AES128_DEFAULT, "AES");
      aesKeyData.setKey(keyDefault);

      // change key 0 last as this is the change key
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(1, KEY_AES128_DEFAULT, this.key1, (byte) key1newVersion);
      
      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(2, KEY_AES128_DEFAULT, this.key2, (byte) key2newVersion);

      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(3, KEY_AES128_DEFAULT, this.key3, (byte) key3newVersion);

      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(4, KEY_AES128_DEFAULT, this.key4, (byte) key4newVersion);

      boltCardWrapper.authenticateEV2First(0, aesKeyData, null);
      boltCardWrapper.changeKey(0, KEY_AES128_DEFAULT, this.key0, (byte) key0newVersion);
    }
    catch(Exception e) {
      result = "Error changing keys: "+e.getMessage();
      // Log.d(TAG, "Error changing keys: "+e);
      throw e;
    }
    WritableMap params = Arguments.createMap();
    params.putString("output", result);
    sendEvent("WriteKeysResult", params);
  }

  /**
   * Reset all keys back to zero bytes from supplied keys
   * @param intent
   * @throws Exception
   */
  private void doresetKeys(BoltCardWrapper boltCardWrapper) throws Exception{
    String result = "";
    
    // String tagname = boltCardWrapper.getType().getTagName() + boltCardWrapper.getType().getDescription();
    // String UID = Utilities.dumpBytes(boltCardWrapper.getUID());
    // if(this.uid == null || !UID.substring(2).toLowerCase().equals(this.uid.toLowerCase())) {
    //   WritableMap params = Arguments.createMap();
    //   params.putString("output", "Error, card UID does not match entered UID");
    //   Log.d(TAG,"card UID entered UID: " + UID + ", " + this.uid);
    //   sendEvent("ChangeKeysResult", params);
    //   return;
    // }

    if(resetKeys[0] == null || resetKeys[1] == null || resetKeys[2] == null || resetKeys[3] == null || resetKeys[4] == null) {
      WritableMap params = Arguments.createMap();
      params.putString("output", "Error, one or more keys not set");
      Log.d(TAG, "Error, one or more keys not set");
      sendEvent("ChangeKeysResult", params);
      return;
    }

    KeyData currentChangeKeyAesKeyData = new KeyData();
    Key currentChangeKey = new SecretKeySpec(this.hexStringToByteArray(resetKeys[0]), "AES");
    currentChangeKeyAesKeyData.setKey(currentChangeKey);

    KeyData defaultaesKeyData = new KeyData();
    Key keyDefault = new SecretKeySpec(KEY_AES128_DEFAULT, "AES");
    defaultaesKeyData.setKey(keyDefault);

    //changeKey(int keyNumber, byte[] currentKeyData, byte[] newKeyData, byte newKeyVersion)
    int keynewVersion = 0;
    try{
      boltCardWrapper.authenticateEV2First(0, currentChangeKeyAesKeyData, null);
      boltCardWrapper.changeKey(0, this.hexStringToByteArray(resetKeys[0]), KEY_AES128_DEFAULT, (byte) keynewVersion);
      result += "Change Key0: Success\r\n";
    }
    catch(Exception e) {
      result += "Change Key0: "+e.getMessage()+". Could be incorrect key. Aborting key reset, please use correct keys. \r\n";
      WritableMap params = Arguments.createMap();
      params.putString("output", result);
      sendEvent("ChangeKeysResult", params);
      return;
    }
    try{
      boltCardWrapper.authenticateEV2First(0, defaultaesKeyData, null);
      boltCardWrapper.changeKey(1, this.hexStringToByteArray(resetKeys[1]), KEY_AES128_DEFAULT, (byte) keynewVersion);
      result += "Change Key1: Success\r\n";
    }
    catch(Exception e) {
      result += "Change Key1: "+e.getMessage()+"\r\n";
    }
    
    try{
      boltCardWrapper.authenticateEV2First(0, defaultaesKeyData, null);
      boltCardWrapper.changeKey(2, this.hexStringToByteArray(resetKeys[2]), KEY_AES128_DEFAULT, (byte) keynewVersion);
      result += "Change Key2: Success\r\n";
    }
    catch(Exception e) {
      result += "Change Key2: "+e.getMessage()+"\r\n";
    }

    try{
      boltCardWrapper.authenticateEV2First(0, defaultaesKeyData, null);
      boltCardWrapper.changeKey(3, this.hexStringToByteArray(resetKeys[3]), KEY_AES128_DEFAULT, (byte) keynewVersion);
      result += "Change Key3: Success\r\n";
    }
    catch(Exception e) {
      result += "Change Key3: "+e.getMessage()+"\r\n";
    }

    try{
      boltCardWrapper.authenticateEV2First(0, defaultaesKeyData, null);
      boltCardWrapper.changeKey(4, this.hexStringToByteArray(resetKeys[4]), KEY_AES128_DEFAULT, (byte) keynewVersion);
      result += "Change Key4: Success\r\n";
    }
    catch(Exception e) {
      result += "Change Key4: "+e.getMessage()+"\r\n";
    }

    try {
      this.authenticateWithDefaultChangeKey(boltCardWrapper);
      boltCardWrapper.wipeNdefAndFileSettings();
      result += "NDEF and SUN/SDM cleared."; 
    }
    catch (Exception e) {
      result += "NDEF SUN/SDM Clear error: "+e.getMessage()+"\r\n";
    }

    WritableMap params = Arguments.createMap();
    params.putString("output", result);
    sendEvent("ChangeKeysResult", params);
  }

  /**
   * Called by react native to set new keys in memory for prepare for writing to the NFC card
   * @param key0
   * @param key1
   * @param key2
   * @param callBack
   */
  public void changeKeys(String key0, String key1, String key2, Callback callBack) {
    this.cardmode = CARD_MODE_WRITEKEYS;
    String result = "Success";
    if(key0 == null && key1 == null && key2 == null) {
      this.key0 = null;
      this.key1 = null;
      this.key2 = null;
    }
    try {
      this.key0 = this.hexStringToByteArray(key0);
      this.key1 = this.hexStringToByteArray(key1);
      this.key2 = this.hexStringToByteArray(key2);    
    }
    catch(Exception e) {
      Log.d(TAG, "Error one or more keys are invalid: "+e.getMessage());
      result = "Error one or more keys are invalid";
    }
    callBack.invoke(result);
  }

  /**
   * Change keys function that allows setting all 5 keys and the LNURLW at the same time.
   * @param lnurlw_base
   * @param key0
   * @param key1
   * @param key2
   * @param key3
   * @param key4
   * @param callBack
   */
  public void changeKeys(String lnurlw_base, String key0, String key1, String key2, String key3, String key4, Callback callBack) {
    this.cardmode = CARD_MODE_WRITEKEYS;
    String result = "Success";
    if (lnurlw_base.indexOf("lnurlw://") == -1) {
      Log.e(TAG, "lnurlw_base is not a valid lnurlw");
      callBack.invoke("lnurlw_base is not a valid lnurlw");
      return;
    }
    if(lnurlw_base == null && key0 == null && key1 == null && key2 == null && key3 == null && key4 == null) {
      this.lnurlw_base = null;
      this.key0 = null;
      this.key1 = null;
      this.key2 = null;
      this.key3 = null;
      this.key4 = null;
    }

    try {
      this.lnurlw_base = lnurlw_base;
      this.key0 = this.hexStringToByteArray(key0);
      this.key1 = this.hexStringToByteArray(key1);
      this.key2 = this.hexStringToByteArray(key2);    
      this.key3 = this.hexStringToByteArray(key3);    
      this.key4 = this.hexStringToByteArray(key4);    
    }
    catch(Exception e) {
      Log.d(TAG, "Error one or more keys are invalid: "+e.getMessage());
      result = "Error one or more keys are invalid";
    }
    Log.d(TAG, "Data Set: "+this.lnurlw_base + " " + 
      this.key0 + " " + 
      this.key1 + " " + 
      this.key2 + " " + 
      this.key3 + " " + 
      this.key4
    );
    callBack.invoke(result);
  }

  private void sendEvent(String eventName, HashMap<String,String> map) {
    WritableMap params = Arguments.createMap();
    for (Map.Entry<String, String> entry : map.entrySet()) {
      String key = entry.getKey();
      String value = entry.getValue();
      params.putString(key, value);
    }
    sendEvent(eventName, params);
  }


  private void sendEvent(String eventName, WritableMap params) {
    ReactContext reactContext = getReactNativeHost().getReactInstanceManager().getCurrentReactContext();
    
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
  }

  /**
   * This will display message in toast or logcat or on screen or all three.
   *
   * @param str           String to be logged or displayed
   * @param operationType 't' for Toast; 'n' for Logcat and Display in UI; 'd' for Toast, Logcat
   *                      and
   *                      Display in UI.
   */
  private void showMessage(final String str, final char operationType) {
    Toast.makeText(MainActivity.this, str, Toast.LENGTH_SHORT).show();
    NxpLogUtils.i(TAG, getString(R.string.Dump_data) + str);
    
  }

  public byte[] hexStringToByteArray(String s) {
    final int len = s.length();
    // "111" is not a valid hex encoding.
    if( len%2 != 0 )
        throw new IllegalArgumentException("hexBinary needs to be even-length: "+s);

    byte[] out = new byte[len/2];

    for( int i=0; i<len; i+=2 ) {
        int h = hexToBin(s.charAt(i  ));
        int l = hexToBin(s.charAt(i+1));
        if( h==-1 || l==-1 )
            throw new IllegalArgumentException("contains illegal character for hexBinary: "+s);

        out[i/2] = (byte)(h*16+l);
    }

    return out;
  }

  private static int hexToBin( char ch ) {
    if( '0'<=ch && ch<='9' )    return ch-'0';
    if( 'A'<=ch && ch<='F' )    return ch-'A'+10;
    if( 'a'<=ch && ch<='f' )    return ch-'a'+10;
    return -1;
  }

  protected String decodeHex(byte[] input) throws Exception {
    return this.decodeHex(new BigInteger(1, input).toString(16));
  }

  protected String decodeHex(String input) throws Exception {
    byte[] bytes = Hex.decodeHex(input.toCharArray());
    return new String(bytes, "UTF-8");
  }

  @Override
  protected void onPause() {
      super.onPause();
      libInstance.stopForeGroundDispatch();
      if (mReactInstanceManager != null) {
          mReactInstanceManager.onHostPause(this);
      }
  }

  @Override
  protected void onResume() {
      super.onResume();

      libInstance.startForeGroundDispatch();
      if (mReactInstanceManager != null) {
          mReactInstanceManager.onHostResume(this, this);
      }
  }

  @Override
  protected void onDestroy() {
      super.onDestroy();

      if (mReactInstanceManager != null) {
          mReactInstanceManager.onHostDestroy(this);
      }
      if (mReactRootView != null) {
          mReactRootView.unmountReactApplication();
      }
  }

  @Override
  public void onBackPressed() {

    if (mReactInstanceManager != null) {
        mReactInstanceManager.onBackPressed();
    } else {
        super.onBackPressed();
    }
  }

  @Override
  public boolean onKeyUp(int keyCode, KeyEvent event) {
      if (keyCode == KeyEvent.KEYCODE_MENU && mReactInstanceManager != null) {
          mReactInstanceManager.showDevOptionsDialog();
          return true;
      }
      return super.onKeyUp(keyCode, event);
  }

  private void clearData() {
    Log.d(TAG, "Clearing data.");
    this.lnurlw_base = null;
    this.key0 = null;
    this.key1 = null;
    this.key2 = null;
    this.key3 = null;
    this.key4 = null;
    this.resetKeys = new String[5];
  }

  public void setNodeURL(String url) {
    this.lnurlw_base = url;
  }

  public void setCardMode(String cardmode) {
    if(cardmode != null) this.cardmode = cardmode;
    else Log.d(TAG, "*** setCardMode called with null string");
  }

  public void setResetKeys(String[] keys, String uid, Callback callBack) {
    this.resetKeys = keys;
    this.uid = uid;
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName()) {
      @Override
      protected Bundle getLaunchOptions() {
        Bundle initialProperties = new Bundle();
        initialProperties.putCharSequence("carddata", new String("Please scan NFC Card"));
        return initialProperties;
      }
    };
  }


  /**
   * Align the back button behavior with Android S
   * where moving root activities to background instead of finishing activities.
   * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
   */
  @Override
  public void invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        // For non-root activities, use the default implementation to finish them.
        super.invokeDefaultOnBackPressed();
      }
      return;
    }

    // Use the default back button implementation on Android S
    // because it's doing more than {@link Activity#moveTaskToBack} in fact.
    super.invokeDefaultOnBackPressed();
  }


}
