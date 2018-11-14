// Copyright (c) 2004-present, Facebook, Inc.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

#pragma once

#include <cxxreact/CxxModule.h>
#include <cxxreact/NativeModule.h>

#ifndef RN_EXPORT
#define RN_EXPORT __attribute__((visibility("default")))
#endif

namespace facebook {
namespace react {

class Instance;
class MessageQueueThread;

std::function<void(folly::dynamic)> makeCallback(
  std::weak_ptr<Instance> instance, const folly::dynamic& callbackId);

class RN_EXPORT CxxNativeModule : public NativeModule {
public:
  CxxNativeModule(std::weak_ptr<Instance> instance,
                  std::string name,
                  xplat::module::CxxModule::Provider provider,
                  std::shared_ptr<MessageQueueThread> messageQueueThread)
  : instance_(instance)
  , name_(std::move(name))
  , provider_(provider)
  , messageQueueThread_(messageQueueThread) {}

  std::string getName() override;
  std::vector<MethodDescriptor> getMethods() override;
  folly::dynamic getConstants() override;
  void invoke(unsigned int reactMethodId, folly::dynamic&& params, int callId) override;
  MethodCallResult callSerializableNativeHook(unsigned int hookId, folly::dynamic&& args) override;

private:
  void lazyInit();

  std::weak_ptr<Instance> instance_;
  std::string name_;
  xplat::module::CxxModule::Provider provider_;
  std::shared_ptr<MessageQueueThread> messageQueueThread_;
  std::unique_ptr<xplat::module::CxxModule> module_;
  std::vector<xplat::module::CxxModule::Method> methods_;
};

}
}
