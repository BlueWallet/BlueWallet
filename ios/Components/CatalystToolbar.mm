#import <TargetConditionals.h>
#import <UIKit/UIKit.h>

#if RCT_NEW_ARCH_ENABLED
#import <BlueWalletSpec/BlueWalletSpec.h>
#import <React/RCTInvalidating.h>

#if TARGET_OS_MACCATALYST
#import <AppKit/AppKit.h>
#endif

@interface CatalystToolbar : NativeCatalystToolbarSpecBase <NativeCatalystToolbarSpec, RCTInvalidating>
@end

#if TARGET_OS_MACCATALYST
@interface CatalystToolbar () <NSToolbarDelegate>
@property(nonatomic, copy) NSString *ownerId;
@property(nonatomic, copy) NSArray<NSDictionary *> *items;
@property(nonatomic, copy) NSArray<NSToolbarItemIdentifier> *itemIdentifiers;
@property(nonatomic, copy) NSDictionary<NSToolbarItemIdentifier, NSDictionary *> *itemsByIdentifier;
@property(nonatomic, strong) NSToolbar *toolbar;
@property(nonatomic, strong) NSToolbar *previousToolbar;
@property(nonatomic, weak) UITitlebar *titlebar;
@end

#endif

@implementation CatalystToolbar

RCT_EXPORT_MODULE(CatalystToolbar)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (void)setItems:(NSString *)ownerId itemsJson:(NSString *)itemsJson
{
#if TARGET_OS_MACCATALYST
  dispatch_async(dispatch_get_main_queue(), ^{
    NSData *data = [itemsJson dataUsingEncoding:NSUTF8StringEncoding];
    NSArray *items = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
    if (![items isKindOfClass:NSArray.class]) {
      return;
    }
    [self installToolbarForOwner:ownerId items:items];
  });
#endif
}

- (void)clearItems:(NSString *)ownerId
{
#if TARGET_OS_MACCATALYST
  dispatch_async(dispatch_get_main_queue(), ^{
    [self clearToolbarForOwner:ownerId force:NO];
  });
#endif
}

- (void)invalidate
{
#if TARGET_OS_MACCATALYST
  dispatch_async(dispatch_get_main_queue(), ^{
    [self clearToolbarForOwner:nil force:YES];
  });
#endif
}

#if TARGET_OS_MACCATALYST
- (UIWindowScene *)activeWindowScene
{
  UIWindowScene *fallback = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    UIWindowScene *windowScene = (UIWindowScene *)scene;
    fallback = fallback ?: windowScene;
    if (windowScene.activationState == UISceneActivationStateForegroundActive) {
      return windowScene;
    }
  }
  return fallback;
}

- (void)installToolbarForOwner:(NSString *)ownerId items:(NSArray<NSDictionary *> *)items
{
  UIWindowScene *windowScene = [self activeWindowScene];
  UITitlebar *titlebar = windowScene.titlebar;
  if (!titlebar) {
    return;
  }

  if (titlebar.toolbar != self.toolbar) {
    self.previousToolbar = titlebar.toolbar;
  }

  self.ownerId = ownerId;
  self.items = items;

  NSMutableArray<NSToolbarItemIdentifier> *identifiers = [NSMutableArray arrayWithObject:NSToolbarFlexibleSpaceItemIdentifier];
  NSMutableDictionary<NSToolbarItemIdentifier, NSDictionary *> *itemsByIdentifier = [NSMutableDictionary dictionary];
  [items enumerateObjectsUsingBlock:^(NSDictionary *item, NSUInteger index, BOOL *stop) {
    NSString *identifier = [NSString stringWithFormat:@"io.bluewallet.floatButton.%@.%lu", ownerId, (unsigned long)index];
    [identifiers addObject:identifier];
    itemsByIdentifier[identifier] = item;
  }];
  self.itemIdentifiers = identifiers;
  self.itemsByIdentifier = itemsByIdentifier;

  NSToolbar *toolbar = [[NSToolbar alloc] initWithIdentifier:@"io.bluewallet.floatButtons"];
  toolbar.delegate = self;
  toolbar.displayMode = NSToolbarDisplayModeIconAndLabel;
  toolbar.allowsUserCustomization = NO;
  self.toolbar = toolbar;
  self.titlebar = titlebar;
  titlebar.toolbar = toolbar;
  titlebar.toolbarStyle = UITitlebarToolbarStyleUnified;
}

- (void)clearToolbarForOwner:(NSString *)ownerId force:(BOOL)force
{
  if (!force && ![self.ownerId isEqualToString:ownerId]) {
    return;
  }
  if (self.titlebar.toolbar == self.toolbar) {
    self.titlebar.toolbar = self.previousToolbar;
  }
  self.toolbar.delegate = nil;
  self.toolbar = nil;
  self.previousToolbar = nil;
  self.titlebar = nil;
  self.ownerId = nil;
  self.items = @[];
  self.itemIdentifiers = @[];
  self.itemsByIdentifier = @{};
}

- (void)emitActionForIdentifier:(NSToolbarItemIdentifier)identifier kind:(NSString *)kind
{
  NSDictionary *descriptor = self.itemsByIdentifier[identifier];
  NSString *itemId = descriptor[@"id"];
  if (!itemId || !self.ownerId) {
    return;
  }
  [self emitOnPress:@{ @"ownerId" : self.ownerId, @"itemId" : itemId, @"kind" : kind }];
}

- (void)toolbarItemPressed:(NSToolbarItem *)sender
{
  [self emitActionForIdentifier:sender.itemIdentifier kind:@"press"];
}

- (NSToolbarItem *)toolbar:(NSToolbar *)toolbar
      itemForItemIdentifier:(NSToolbarItemIdentifier)itemIdentifier
  willBeInsertedIntoToolbar:(BOOL)flag
{
  NSDictionary *descriptor = self.itemsByIdentifier[itemIdentifier];
  if (!descriptor) {
    return nil;
  }

  BOOL hasSecondaryAction = [descriptor[@"hasSecondaryAction"] boolValue];
  NSToolbarItem *item;
  if (hasSecondaryAction) {
    NSMenuToolbarItem *menuItem = [[NSMenuToolbarItem alloc] initWithItemIdentifier:itemIdentifier];
    __weak CatalystToolbar *weakSelf = self;
    UIAction *moreAction = [UIAction actionWithTitle:NSLocalizedString(@"More…", nil)
                                               image:[UIImage systemImageNamed:@"ellipsis.circle"]
                                          identifier:nil
                                             handler:^(__kindof UIAction *action) {
      [weakSelf emitActionForIdentifier:itemIdentifier kind:@"longPress"];
    }];
    menuItem.itemMenu = [UIMenu menuWithTitle:@"" children:@[ moreAction ]];
    item = menuItem;
  } else {
    item = [[NSToolbarItem alloc] initWithItemIdentifier:itemIdentifier];
  }

  NSString *title = descriptor[@"title"] ?: @"";
  item.label = title;
  item.paletteLabel = title;
  item.title = title;
  item.toolTip = title;
  item.image = [UIImage systemImageNamed:descriptor[@"systemImageName"] ?: @"circle"];
  item.target = self;
  item.action = @selector(toolbarItemPressed:);
  item.enabled = ![descriptor[@"disabled"] boolValue];
  item.bordered = YES;
  item.visibilityPriority = NSToolbarItemVisibilityPriorityHigh;
  return item;
}

- (NSArray<NSToolbarItemIdentifier> *)toolbarDefaultItemIdentifiers:(NSToolbar *)toolbar
{
  return self.itemIdentifiers;
}

- (NSArray<NSToolbarItemIdentifier> *)toolbarAllowedItemIdentifiers:(NSToolbar *)toolbar
{
  return self.itemIdentifiers;
}
#endif

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCatalystToolbarSpecJSI>(params);
}

@end

#endif // RCT_NEW_ARCH_ENABLED
