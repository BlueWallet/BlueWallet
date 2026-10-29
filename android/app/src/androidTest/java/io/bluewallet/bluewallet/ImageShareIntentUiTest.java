package io.bluewallet.bluewallet;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.rule.ActivityTestRule;

import org.junit.After;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.nio.file.Files;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class ImageShareIntentUiTest {
    private static final byte[] IMAGE_BYTES = new byte[] {
        (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    };

    @Rule
    public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @After
    public void tearDown() {
        if (activityRule.getActivity() != null) activityRule.finishActivity();
        File directory = new File(targetContext().getCacheDir(), "shared-images");
        File[] files = directory.listFiles();
        if (files != null) for (File file : files) file.delete();
    }

    @Test
    public void imageShareColdStartBecomesPrivateViewIntent() throws Exception {
        MainActivity activity = activityRule.launchActivity(imageShareIntent("image/png"));
        Intent receivedIntent = activity.getIntent();

        assertEquals(Intent.ACTION_VIEW, receivedIntent.getAction());
        assertEquals("file", receivedIntent.getData().getScheme());
        assertEquals("image/png", receivedIntent.getType());
        assertTrue(receivedIntent.getData().getPath().contains("/shared-images/"));
        assertArrayEquals(IMAGE_BYTES, Files.readAllBytes(new File(receivedIntent.getData().getPath()).toPath()));
    }

    @Test
    public void imageShareWhileRunningIsCopiedIntoPrivateCache() throws Exception {
        MainActivity activity = activityRule.launchActivity(new Intent(Intent.ACTION_MAIN));
        Intent shareIntent = imageShareIntent("image/jpeg");

        activity.runOnUiThread(() -> activity.onNewIntent(shareIntent));
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();

        File[] importedFiles = new File(targetContext().getCacheDir(), "shared-images").listFiles();
        assertNotNull(importedFiles);
        assertEquals(1, importedFiles.length);
        assertTrue(importedFiles[0].getName().endsWith(".jpg"));
        assertArrayEquals(IMAGE_BYTES, Files.readAllBytes(importedFiles[0].toPath()));
    }

    @Test
    public void nonImageShareIsNotClaimedByImageImporter() {
        Intent textShare = new Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_TEXT, "not an image");

        MainActivity activity = activityRule.launchActivity(textShare);

        assertEquals(Intent.ACTION_SEND, activity.getIntent().getAction());
        assertEquals("text/plain", activity.getIntent().getType());
    }

    private Intent imageShareIntent(String mimeType) throws Exception {
        Context testContext = InstrumentationRegistry.getInstrumentation().getContext();
        File directory = new File(testContext.getCacheDir(), "shared-test-images");
        assertTrue(directory.mkdirs() || directory.isDirectory());
        File source = new File(directory, mimeType.endsWith("jpeg") ? "shared.jpg" : "shared.png");
        Files.write(source.toPath(), IMAGE_BYTES);
        Uri uri = FileProvider.getUriForFile(testContext, "io.bluewallet.bluewallet.test.provider", source);

        return new Intent(Intent.ACTION_SEND)
            .setType(mimeType)
            .putExtra(Intent.EXTRA_STREAM, uri)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    }

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }
}
