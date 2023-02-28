package com.boltcard.boltcard;

import com.nxp.nfclib.NxpNfcLib;
import com.nxp.nfclib.CardType;
import com.nxp.nfclib.defaultimpl.KeyData;
import com.nxp.nfclib.desfire.DESFireFactory;
import com.nxp.nfclib.desfire.INTAG424DNA;
import com.nxp.nfclib.desfire.INTAG424DNATT;
import com.nxp.nfclib.desfire.NTAG424DNAFileSettings;
import com.nxp.nfclib.desfire.NTAG424DNATTFileSettings;
import com.nxp.nfclib.desfire.MFPCard;
import com.nxp.nfclib.interfaces.ICard;
import com.nxp.nfclib.ndef.INdefOperations;
import com.nxp.nfclib.ndef.INdefMessage;
import com.nxp.nfclib.ndef.INdefMessage;
import com.nxp.nfclib.ndef.NdefMessageWrapper;

public class BoltCardWrapper {

    private INTAG424DNA ntag424DNA = null;
    private INTAG424DNATT ntag424DNATT = null;
    private ICard iCard = null;
    private INdefOperations iNdefOperations = null;


    public BoltCardWrapper(NxpNfcLib libInstance, CardType type)
    {
        
        if (type == CardType.NTAG424DNA) {
            this.ntag424DNA = DESFireFactory.getInstance().getNTAG424DNA(libInstance.getCustomModules());
            this.iCard = this.ntag424DNA;
            this.iNdefOperations = this.ntag424DNA;
        }
        else {
            this.ntag424DNATT = DESFireFactory.getInstance().getNTAG424DNATT(libInstance.getCustomModules());
            this.iCard = this.ntag424DNATT;
            this.iNdefOperations = this.ntag424DNATT;}
    }

    public CardType getType()
    {
        return this.iCard.getType();
    }

    public byte[] getUID()
    {
        return this.iCard.getUID();
    }

    public int getTotalMemory()
    {
        return this.iCard.getTotalMemory();
    }

    public INdefMessage readNDEF()
    {
        return this.iNdefOperations.readNDEF();
    }

    public void writeNDEF(INdefMessage ndefMsg)
    {
        this.iNdefOperations.writeNDEF(ndefMsg);
    }

    public void wipeNdefAndFileSettings()
    {
        if (this.ntag424DNA != null) {

            NTAG424DNAFileSettings fileSettings = new NTAG424DNAFileSettings(
                MFPCard.CommunicationMode.Plain,
                (byte) 0xE,
                (byte) 0xE,
                (byte) 0xE,
                (byte) 0x0
            );

            fileSettings.setSdmAccessRights(new byte[] {(byte) 0xFF, (byte) 0x12});
            fileSettings.setSDMEnabled(false);
            fileSettings.setUIDMirroringEnabled(false);
            fileSettings.setSDMReadCounterEnabled(false);

            this.ntag424DNA.changeFileSettings(2, fileSettings);
        }
        else {
            NTAG424DNATTFileSettings fileSettings = new NTAG424DNATTFileSettings(
                MFPCard.CommunicationMode.Plain,
                (byte) 0xE,
                (byte) 0xE,
                (byte) 0xE,
                (byte) 0x0
            );

            fileSettings.setSdmAccessRights(new byte[] {(byte) 0xFF, (byte) 0x12});
            fileSettings.setSDMEnabled(false);
            fileSettings.setUIDMirroringEnabled(false);
            fileSettings.setSDMReadCounterEnabled(false);

            this.ntag424DNATT.changeFileSettings(2, fileSettings);
        }
        INdefMessage ndefMsg = NdefMessageWrapper.getEmptyNdefRecord();
        this.iNdefOperations.writeNDEF(ndefMsg);

    }

    public byte[] getVersion()
    {
        if (this.ntag424DNA != null) {
            return this.ntag424DNA.getVersion();
        }
        return this.ntag424DNATT.getVersion();
    }

    public byte[] isoSelectApplicationByDFName(byte[] dfName)
    {
        if (this.ntag424DNA != null) {
            return this.ntag424DNA.isoSelectApplicationByDFName(dfName);
        }
        return this.ntag424DNATT.isoSelectApplicationByDFName(dfName);
    }

    public void authenticateEV2First(int cardKeyNumber, KeyData key, byte[] pCDcap2)
    {
        if (this.ntag424DNA != null) {
            this.ntag424DNA.authenticateEV2First(cardKeyNumber, key, pCDcap2);
        }
        else {
            this.ntag424DNATT.authenticateEV2First(cardKeyNumber, key, pCDcap2);
        }
    }

    public byte getKeyVersion(int keyNumber)
    {
        if (this.ntag424DNA != null) {
            return this.ntag424DNA.getKeyVersion(keyNumber);
        }
        return this.ntag424DNATT.getKeyVersion(keyNumber);
    }

    public void changeKey(int keyNumber, byte[] currentKeyData, byte[] newKeyData, byte newKeyVersion)
    {
        if (this.ntag424DNA != null) {
            this.ntag424DNA.changeKey(keyNumber, currentKeyData, newKeyData, newKeyVersion);
        }
        else {
            this.ntag424DNATT.changeKey(keyNumber, currentKeyData, newKeyData, newKeyVersion);
        }
    }

    public void setAndChangeFileSettings(int piccOffset, int macOffset)
    {
        if (this.ntag424DNA != null) {

            NTAG424DNAFileSettings fileSettings = new NTAG424DNAFileSettings(
                MFPCard.CommunicationMode.Plain,
                (byte) 0xE,
                (byte) 0x0,
                (byte) 0x0,
                (byte) 0x0
            );

            fileSettings.setSdmAccessRights(new byte[] {(byte) 0xFF, (byte) 0x12});
            fileSettings.setSDMEnabled(true);
            fileSettings.setUIDMirroringEnabled(true);
            fileSettings.setSDMReadCounterEnabled(true);
            fileSettings.setSDMReadCounterLimitEnabled(false);
            fileSettings.setSDMEncryptFileDataEnabled(false);
            fileSettings.setUidOffset(null);
            fileSettings.setSdmReadCounterOffset(null);
            fileSettings.setPiccDataOffset(new byte[] {(byte) piccOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmMacInputOffset(new byte[] {(byte) macOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmEncryptionOffset(null);
            fileSettings.setSdmEncryptionLength(null);
            fileSettings.setSdmMacOffset(new byte[] {(byte) macOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmReadCounterLimit(null);

            this.ntag424DNA.changeFileSettings(2, fileSettings);
        }
        else {
            NTAG424DNATTFileSettings fileSettings = new NTAG424DNATTFileSettings(
                MFPCard.CommunicationMode.Plain,
                (byte) 0xE,
                (byte) 0x0,
                (byte) 0x0,
                (byte) 0x0
            );

            fileSettings.setSdmAccessRights(new byte[] {(byte) 0xFF, (byte) 0x12});
            fileSettings.setSDMEnabled(true);
            fileSettings.setUIDMirroringEnabled(true);
            fileSettings.setSDMReadCounterEnabled(true);
            fileSettings.setSDMReadCounterLimitEnabled(false);
            fileSettings.setSDMEncryptFileDataEnabled(false);
            fileSettings.setUidOffset(null);
            fileSettings.setSdmReadCounterOffset(null);
            fileSettings.setPiccDataOffset(new byte[] {(byte) piccOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmMacInputOffset(new byte[] {(byte) macOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmEncryptionOffset(null);
            fileSettings.setSdmEncryptionLength(null);
            fileSettings.setSdmMacOffset(new byte[] {(byte) macOffset, (byte) 0, (byte) 0});
            fileSettings.setSdmReadCounterLimit(null);

            this.ntag424DNATT.changeFileSettings(2, fileSettings);
        }
    }
    
    public void setPICCConfiguration(boolean enableRandomUID) {
        if (this.ntag424DNA != null) {
            this.ntag424DNA.setPICCConfiguration(enableRandomUID);
        }
        else {
            this.ntag424DNATT.setPICCConfiguration(enableRandomUID);
        }
    }
} 