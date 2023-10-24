// BwFileAccess.m

#import "BwFileAccess.h"


@implementation BwFileAccess

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(readFileContent:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSURL *fileURL = [NSURL URLWithString:filePath];

    if ([fileURL startAccessingSecurityScopedResource]) {
        NSError *error;
        NSData *fileData = [NSData dataWithContentsOfURL:fileURL options:0 error:&error];

        if (fileData) {
            NSString *fileContent = [[NSString alloc] initWithData:fileData encoding:NSUTF8StringEncoding];
            resolve(fileContent);
        } else {
            reject(@"READ_ERROR", @"Failed to read file", error);
        }

        [fileURL stopAccessingSecurityScopedResource];
    } else {
        reject(@"ACCESS_ERROR", @"Failed to access security scoped resource", nil);
    }
}

@end
