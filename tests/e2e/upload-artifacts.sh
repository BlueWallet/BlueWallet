#!/usr/bin/env bash

echo uploading artifacts...
tar -cvzf artifacts.tar.gz artifacts
FILENAME="artifacts.tar.gz"
HASH=`date +%s`
FILENAME_UNIQ="$HASH.tar.gz"
cp "$FILENAME" "$FILENAME_UNIQ"
curl "http://filestorage.bluewallet.io:1488/upload.php" -F "fileToUpload=@$FILENAME_UNIQ"
rm "$FILENAME_UNIQ"
DLOAD="http://filestorage.bluewallet.io:1488/$HASH.tar.gz"
echo artifacts download link:
echo $DLOAD