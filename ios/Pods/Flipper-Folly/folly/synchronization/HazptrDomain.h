/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#pragma once

#include <atomic>
#include <unordered_set>

#include <folly/Memory.h>
#include <folly/Portability.h>
#include <folly/executors/QueuedImmediateExecutor.h>
#include <folly/synchronization/AsymmetricMemoryBarrier.h>
#include <folly/synchronization/Hazptr-fwd.h>
#include <folly/synchronization/HazptrObj.h>
#include <folly/synchronization/HazptrRec.h>
#include <folly/synchronization/HazptrThrLocal.h>

///
/// Classes related to hazard pointer domains.
///

namespace folly {

namespace detail {

/** Threshold for the number of retired objects to trigger
    asynchronous reclamation. */
constexpr int hazptr_domain_rcount_threshold() {
  return 1000;
}

} // namespace detail

/**
 *  hazptr_domain
 *
 *  A domain manages a set of hazard pointers and a set of retired objects.
 *
 *  Most user code need not specify any domains.
 *
 *  Notes on destruction order and tagged objects:
 *  - Tagged objects support reclamation order guarantees (i.e.,
 *    synchronous reclamation). A call to cleanup_cohort_tag(tag)
 *    guarantees that all objects with the specified tag are reclaimed
 *    before the function returns.
 *  - There are two types of reclamation operations to consider:
 *   - Asynchronous reclamation: It is triggered by meeting some
 *     threshold for the number of retired objects or the time since
 *     the last asynchronous reclamation. Reclaimed objects may have
 *     different tags or no tags. Hazard pointers are checked and only
 *     unprotected objects are reclaimed. This type is expected to be
 *     expensive but infrequent and the cost is amortized over a large
 *     number of reclaimed objects. This type is needed to guarantee
 *     an upper bound on unreclaimed reclaimable objects.
 *   - Synchronous reclamation: It is invoked by calling
 *     cleanup_cohort_tag for a specific tag. All objects with the
 *     specified tag must be reclaimed unconditionally before
 *     returning from such a function call. Hazard pointers are not
 *     checked. This type of reclamation operation is expected to be
 *     inexpensive and may be invoked more frequently than
 *     asynchronous reclamation.
 *  - Tagged retired objects are kept in a sharded list in the domain
 *    structure.
 *  - Both asynchronous and synchronous reclamation pop all the
 *    objects in the tagged list(s) and sort them into two sets of
 *    reclaimable and unreclaimable objects. The objects in the
 *    reclaimable set are reclaimed and the objects in the
 *    unreclaimable set are pushed back in the tagged list(s).
 *  - The tagged list(s) are locked between popping all objects and
 *    pushing back unreclaimable objects, in order to guarantee that
 *    synchronous reclamation operations do not miss any objects.
 *  - Asynchronous reclamation can release the lock(s) on the tagged
 *    list(s) before reclaiming reclaimable objects, because it pushes
 *    reclaimable tagged objects in their respective cohorts, which
 *    would handle concurrent synchronous reclamation of such objects
 *    properly.
 *  - Synchronous reclamation operations can release the lock on the
 *    tagged list shard before reclaiming objects because the sets of
 *    reclaimable objects by different synchronous reclamation
 *    operations are disjoint.
 */
template <template <typename> class Atom>
class hazptr_domain {
  using Obj = hazptr_obj<Atom>;
  using List = hazptr_detail::linked_list<Obj>;
  using ObjList = hazptr_obj_list<Atom>;
  using RetiredList = hazptr_detail::shared_head_only_list<Obj, Atom>;
  using Set = std::unordered_set<const void*>;
  using ExecFn = folly::Executor* (*)();

  static constexpr int kThreshold = detail::hazptr_domain_rcount_threshold();
  static constexpr int kMultiplier = 2;
  static constexpr int kListTooLarge = 100000;
  static constexpr uint64_t kSyncTimePeriod{2000000000}; // nanoseconds
  static constexpr uintptr_t kTagBit = hazptr_obj<Atom>::kTagBit;

  static constexpr int kNumShards = 8;
  static constexpr int kShardMask = kNumShards - 1;
  static_assert(
      (kNumShards & kShardMask) == 0, "kNumShards must be a power of 2");

  static folly::Executor* get_default_executor() {
    return &folly::QueuedImmediateExecutor::instance();
  }

  Atom<hazptr_rec<Atom>*> hazptrs_{nullptr};
  Atom<hazptr_obj<Atom>*> retired_{nullptr};
  Atom<uint64_t> sync_time_{0};
  /* Using signed int for rcount_ because it may transiently be negative.
     Using signed int for all integer variables that may be involved in
     calculations related to the value of rcount_. */
  Atom<int> hcount_{0};
  Atom<int> rcount_{0};
  Atom<uint16_t> num_bulk_reclaims_{0};
  bool shutdown_{false};
  RetiredList untagged_;
  RetiredList tagged_[kNumShards];
  Atom<int> count_{0};
  Obj* unprotected_; // List of unprotected objects being reclaimed
  ObjList children_; // Children of unprotected objects being reclaimed
  Atom<uint64_t> due_time_{0};
  Atom<ExecFn> exec_fn_{nullptr};
  Atom<int> exec_backlog_{0};

 public:
  /** Constructor */
  hazptr_domain() = default;

  /** Destructor */
  ~hazptr_domain() {
    shutdown_ = true;
    reclaim_all_objects();
    free_hazptr_recs();
    if (kIsDebug && !tagged_empty()) {
      LOG(WARNING)
          << "Tagged objects remain. This may indicate a higher-level leak "
          << "of object(s) that use hazptr_obj_cohort.";
    }
  }

  hazptr_domain(const hazptr_domain&) = delete;
  hazptr_domain(hazptr_domain&&) = delete;
  hazptr_domain& operator=(const hazptr_domain&) = delete;
  hazptr_domain& operator=(hazptr_domain&&) = delete;

  void set_executor(ExecFn exfn) {
    exec_fn_.store(exfn, std::memory_order_release);
  }

  void clear_executor() { exec_fn_.store(nullptr, std::memory_order_release); }

  /** retire - nonintrusive - allocates memory */
  template <typename T, typename D = std::default_delete<T>>
  void retire(T* obj, D reclaim = {}) {
    struct hazptr_retire_node : hazptr_obj<Atom> {
      std::unique_ptr<T, D> obj_;
      hazptr_retire_node(T* retireObj, D toReclaim)
          : obj_{retireObj, std::move(toReclaim)} {}
    };

    auto node = new hazptr_retire_node(obj, std::move(reclaim));
    node->reclaim_ = [](hazptr_obj<Atom>* p, hazptr_obj_list<Atom>&) {
      delete static_cast<hazptr_retire_node*>(p);
    };
    hazptr_obj_list<Atom> l(node);
    push_retired(l);
  }

  /** cleanup */
  void cleanup() noexcept {
    relaxed_cleanup();
    wait_for_zero_bulk_reclaims(); // wait for concurrent bulk_reclaim-s
  }

  /** cleanup_cohort_tag */
  void cleanup_cohort_tag(const hazptr_obj_cohort<Atom>* cohort) noexcept {
    auto tag = reinterpret_cast<uintptr_t>(cohort) + kTagBit;
    auto shard = calc_shard(tag);
    auto obj = tagged_[shard].pop_all(RetiredList::kAlsoLock);
    ObjList match, nomatch;
    list_match_tag(tag, obj, match, nomatch);
    List l(nomatch.head(), nomatch.tail());
    tagged_[shard].push_unlock(l);
    add_count(-match.count());
    obj = match.head();
    reclaim_list_transitive(obj);
    int count = match.count() + nomatch.count();
    if (count > kListTooLarge) {
      hazptr_warning_list_too_large(tag, shard, count);
    }
  }

  void list_match_tag(
      uintptr_t tag, Obj* obj, ObjList& match, ObjList& nomatch) {
    list_match_condition(
        obj, match, nomatch, [tag](Obj* o) { return o->cohort_tag() == tag; });
  }

 private:
  using hazptr_rec_alloc = AlignedSysAllocator<
      hazptr_rec<Atom>,
      FixedAlign<alignof(hazptr_rec<Atom>)>>;

  friend void hazptr_domain_push_list<Atom>(
      hazptr_obj_list<Atom>&, hazptr_domain<Atom>&) noexcept;
  friend void hazptr_domain_push_retired<Atom>(
      hazptr_obj_list<Atom>&, bool check, hazptr_domain<Atom>&) noexcept;
  friend class hazptr_holder<Atom>;
  friend class hazptr_obj<Atom>;
  friend class hazptr_obj_cohort<Atom>;
#if FOLLY_HAZPTR_THR_LOCAL
  friend class hazptr_tc<Atom>;
#endif

  int load_count() { return count_.load(std::memory_order_acquire); }

  void add_count(int val) { count_.fetch_add(val, std::memory_order_release); }

  int exchange_count(int val) {
    return count_.exchange(val, std::memory_order_acq_rel);
  }

  bool cas_count(int& expected, int newval) {
    return count_.compare_exchange_weak(
        expected, newval, std::memory_order_acq_rel, std::memory_order_relaxed);
  }

  uint64_t load_due_time() { return due_time_.load(std::memory_order_acquire); }

  void set_due_time() {
    uint64_t time = std::chrono::duration_cast<std::chrono::nanoseconds>(
                        std::chrono::steady_clock::now().time_since_epoch())
                        .count();
    due_time_.store(time + kSyncTimePeriod, std::memory_order_release);
  }

  bool cas_due_time(uint64_t& expected, uint64_t newval) {
    return due_time_.compare_exchange_strong(
        expected, newval, std::memory_order_acq_rel, std::memory_order_relaxed);
  }

  /** hprec_acquire */
  hazptr_rec<Atom>* hprec_acquire() {
    auto rec = try_acquire_existing_hprec();
    return rec != nullptr ? rec : acquire_new_hprec();
  }

  /** hprec_release */
  void hprec_release(hazptr_rec<Atom>* hprec) noexcept { hprec->release(); }

  /** push_retired */
  void push_retired(hazptr_obj_list<Atom>& l, bool check = true) {
    /*** Full fence ***/ asymmetricLightBarrier();
    while (true) {
      auto r = retired();
      l.tail()->set_next(r);
      if (retired_.compare_exchange_weak(
              r,
              l.head(),
              std::memory_order_release,
              std::memory_order_acquire)) {
        break;
      }
    }
    rcount_.fetch_add(l.count(), std::memory_order_release);
    if (check) {
      check_cleanup_and_reclaim();
    }
  }

  /** push_list */
  void push_list(ObjList& l) {
    if (l.empty()) {
      return;
    }
    uintptr_t btag = l.head()->cohort_tag();
    bool tagged = ((btag & kTagBit) == kTagBit);
    /*** Full fence ***/ asymmetricLightBarrier();
    List ll(l.head(), l.tail());
    if (!tagged) {
      untagged_.push(ll, RetiredList::kMayNotBeLocked);
    } else {
      tagged_[calc_shard(btag)].push(ll, RetiredList::kMayBeLocked);
    }
    add_count(l.count());
    check_threshold_and_reclaim();
  }

  /** threshold */
  int threshold() {
    auto thresh = kThreshold;
    return std::max(thresh, kMultiplier * hcount());
  }

  /** check_threshold_and_reclaim */
  void check_threshold_and_reclaim() {
    int rcount = check_count_threshold();
    if (rcount == 0) {
      rcount = check_due_time();
      if (rcount == 0)
        return;
    }
    if (std::is_same<Atom<int>, std::atomic<int>>{} &&
        this == &default_hazptr_domain<Atom>() &&
        FLAGS_folly_hazptr_use_executor) {
      invoke_reclamation_in_executor(rcount);
    } else {
      do_reclamation(rcount);
    }
  }

  /** calc_shard */
  size_t calc_shard(uintptr_t tag) {
    size_t shard = std::hash<uintptr_t>{}(tag)&kShardMask;
    DCHECK(shard < kNumShards);
    return shard;
  }

  /** check_due_time */
  int check_due_time() {
    uint64_t time = std::chrono::duration_cast<std::chrono::nanoseconds>(
                        std::chrono::steady_clock::now().time_since_epoch())
                        .count();
    auto due = load_due_time();
    if (time < due || !cas_due_time(due, time + kSyncTimePeriod))
      return 0;
    return exchange_count(0);
  }

  /** check_count_threshold */
  int check_count_threshold() {
    int rcount = load_count();
    while (rcount >= threshold()) {
      if (cas_count(rcount, 0)) {
        set_due_time();
        return rcount;
      }
    }
    return 0;
  }

  /** tagged_empty */
  bool tagged_empty() {
    for (int s = 0; s < kNumShards; ++s) {
      if (!tagged_[s].empty())
        return false;
    }
    return true;
  }

  /** extract_retired_objects */
  bool extract_retired_objects(Obj*& untagged, Obj* tagged[]) {
    bool empty = true;
    untagged = untagged_.pop_all(RetiredList::kDontLock);
    if (untagged) {
      empty = false;
    }
    for (int s = 0; s < kNumShards; ++s) {
      /* Tagged lists need to be locked because tagging is used to
       * guarantee the identification of all objects with a specific
       * tag. Locking protects against concurrent hazptr_cleanup_tag()
       * calls missing tagged objects. */
      if (tagged_[s].check_lock()) {
        tagged[s] = nullptr;
      } else {
        tagged[s] = tagged_[s].pop_all(RetiredList::kAlsoLock);
        if (tagged[s]) {
          empty = false;
        } else {
          List l;
          tagged_[s].push_unlock(l);
        }
      }
    }
    return !empty;
  }

  /** load_hazptr_vals */
  Set load_hazptr_vals() {
    Set hs;
    auto hprec = hazptrs_.load(std::memory_order_acquire);
    for (; hprec; hprec = hprec->next()) {
      hs.insert(hprec->hazptr());
    }
    return hs;
  }

  /** match_tagged */
  int match_tagged(Obj* tagged[], Set& hs) {
    int count = 0;
    for (int s = 0; s < kNumShards; ++s) {
      if (tagged[s]) {
        ObjList match, nomatch;
        list_match_condition(tagged[s], match, nomatch, [&](Obj* o) {
          return hs.count(o->raw_ptr()) > 0;
        });
        count += nomatch.count();
        auto obj = nomatch.head();
        while (obj) {
          auto next = obj->next();
          auto cohort = obj->cohort();
          DCHECK(cohort);
          cohort->push_safe_obj(obj);
          obj = next;
        }
        List l(match.head(), match.tail());
        tagged_[s].push_unlock(l);
      }
    }
    return count;
  }

  /** match_reclaim_untagged */
  int match_reclaim_untagged(Obj* untagged, Set& hs) {
    ObjList match, nomatch;
    list_match_condition(untagged, match, nomatch, [&](Obj* o) {
      return hs.count(o->raw_ptr()) > 0;
    });
    ObjList children;
    int count = nomatch.count();
    reclaim_unprotected_unsafe(nomatch.head(), children);
    count -= children.count();
    match.splice(children);
    List l(match.head(), match.tail());
    untagged_.push(l, RetiredList::kMayNotBeLocked);
    return count;
  }

  /** do_reclamation */
  void do_reclamation(int rcount) {
    while (true) {
      Obj* untagged;
      Obj* tagged[kNumShards];
      if (extract_retired_objects(untagged, tagged)) {
        /*** Full fence ***/ asymmetricHeavyBarrier(AMBFlags::EXPEDITED);
        Set hs = load_hazptr_vals();
        rcount -= match_tagged(tagged, hs);
        rcount -= match_reclaim_untagged(untagged, hs);
      }
      if (rcount) {
        add_count(rcount);
      }
      rcount = check_count_threshold();
      if (rcount == 0)
        return;
    }
  }

  /** lookup_and_reclaim */
  void lookup_and_reclaim(Obj* obj, const Set& hs, ObjList& keep) {
    while (obj) {
      auto next = obj->next();
      DCHECK_NE(obj, next);
      if (hs.count(obj->raw_ptr()) == 0) {
        (*(obj->reclaim()))(obj, keep);
      } else {
        keep.push(obj);
      }
      obj = next;
    }
  }

  /** list_match_condition */
  template <typename Cond>
  void list_match_condition(
      Obj* obj, ObjList& match, ObjList& nomatch, const Cond& cond) {
    while (obj) {
      auto next = obj->next();
      DCHECK_NE(obj, next);
      if (cond(obj)) {
        match.push(obj);
      } else {
        nomatch.push(obj);
      }
      obj = next;
    }
  }

  /** reclaim_unprotected_safe */
  void reclaim_unprotected_safe() {
    while (unprotected_) {
      auto obj = unprotected_;
      unprotected_ = obj->next();
      (*(obj->reclaim()))(obj, children_);
    }
  }

  /** reclaim_unprotected_unsafe */
  void reclaim_unprotected_unsafe(Obj* obj, ObjList& children) {
    while (obj) {
      auto next = obj->next();
      (*(obj->reclaim()))(obj, children);
      obj = next;
    }
  }

  /** reclaim_unconditional */
  void reclaim_unconditional(Obj* head, ObjList& children) {
    while (head) {
      auto next = head->next();
      (*(head->reclaim()))(head, children);
      head = next;
    }
  }

  hazptr_rec<Atom>* head() const noexcept {
    return hazptrs_.load(std::memory_order_acquire);
  }

  hazptr_obj<Atom>* retired() const noexcept {
    return retired_.load(std::memory_order_acquire);
  }

  int hcount() const noexcept {
    return hcount_.load(std::memory_order_acquire);
  }

  int rcount() const noexcept {
    return rcount_.load(std::memory_order_acquire);
  }

  bool reached_threshold(int rc, int hc) const noexcept {
    return rc >= kThreshold && rc >= kMultiplier * hc;
  }

  void reclaim_all_objects() {
    auto head = retired_.exchange(nullptr);
    reclaim_list_transitive(head);
    head = untagged_.pop_all(RetiredList::kDontLock);
    reclaim_list_transitive(head);
  }

  void reclaim_list_transitive(Obj* head) {
    while (head) {
      ObjList children;
      reclaim_unconditional(head, children);
      head = children.head();
    }
  }

  void free_hazptr_recs() {
    /* Leak the hazard pointers for the default domain to avoid
       destruction order issues with thread caches. */
    if (this == &default_hazptr_domain<Atom>()) {
      return;
    }
    auto rec = head();
    while (rec) {
      auto next = rec->next();
      DCHECK(!rec->active());
      rec->~hazptr_rec<Atom>();
      hazptr_rec_alloc{}.deallocate(rec, 1);
      rec = next;
    }
  }

  void check_cleanup_and_reclaim() {
    if (try_timed_cleanup()) {
      return;
    }
    if (reached_threshold(rcount(), hcount())) {
      try_bulk_reclaim();
    }
  }

  void relaxed_cleanup() noexcept {
#if FOLLY_HAZPTR_THR_LOCAL
    hazptr_obj<Atom>* h = nullptr;
    hazptr_obj<Atom>* t = nullptr;
    for (hazptr_priv<Atom>& priv :
         hazptr_priv_singleton<Atom>::accessAllThreads()) {
      priv.collect(h, t);
    }
    if (h) {
      DCHECK(t);
      hazptr_obj_list<Atom> l(h, t, 0);
      push_retired(l);
    }
#endif
    rcount_.store(0, std::memory_order_release);
    bulk_reclaim(true);
  }

  void wait_for_zero_bulk_reclaims() {
    while (num_bulk_reclaims_.load(std::memory_order_acquire) > 0) {
      std::this_thread::yield();
    }
  }

  void try_bulk_reclaim() {
    auto hc = hcount();
    auto rc = rcount();
    if (!reached_threshold(rc, hc)) {
      return;
    }
    rc = rcount_.exchange(0, std::memory_order_release);
    if (!reached_threshold(rc, hc)) {
      /* No need to add rc back to rcount_. At least one concurrent
         try_bulk_reclaim will proceed to bulk_reclaim. */
      return;
    }
    bulk_reclaim();
  }

  void bulk_reclaim(bool transitive = false) {
    num_bulk_reclaims_.fetch_add(1, std::memory_order_acquire);
    while (true) {
      auto obj = retired_.exchange(nullptr, std::memory_order_acquire);
      /*** Full fence ***/ asymmetricHeavyBarrier(AMBFlags::EXPEDITED);
      auto rec = hazptrs_.load(std::memory_order_acquire);
      /* Part 1 - read hazard pointer values into private search structure */
      std::unordered_set<const void*> hashset;
      for (; rec; rec = rec->next()) {
        hashset.insert(rec->hazptr());
      }
      /* Part 2 - for each retired object, reclaim if no match */
      if (bulk_lookup_and_reclaim(obj, hashset) || !transitive) {
        break;
      }
    }
    num_bulk_reclaims_.fetch_sub(1, std::memory_order_release);
  }

  bool bulk_lookup_and_reclaim(
      hazptr_obj<Atom>* obj, const std::unordered_set<const void*>& hashset) {
    hazptr_obj_list<Atom> children;
    hazptr_obj_list<Atom> matched;
    while (obj) {
      auto next = obj->next();
      DCHECK_NE(obj, next);
      if (hashset.count(obj->raw_ptr()) == 0) {
        (*(obj->reclaim()))(obj, children);
      } else {
        matched.push(obj);
      }
      obj = next;
    }
#if FOLLY_HAZPTR_THR_LOCAL
    if (!shutdown_) {
      hazptr_priv_tls<Atom>().push_all_to_domain(false);
    }
#endif
    bool done = ((children.count() == 0) && (retired() == nullptr));
    matched.splice(children);
    if (matched.count() > 0) {
      push_retired(matched, false /* don't call bulk_reclaim recursively */);
    }
    return done;
  }

  bool check_sync_time(Atom<uint64_t>& sync_time) {
    uint64_t time = std::chrono::duration_cast<std::chrono::nanoseconds>(
                        std::chrono::steady_clock::now().time_since_epoch())
                        .count();
    auto prevtime = sync_time.load(std::memory_order_relaxed);
    if (time < prevtime ||
        !sync_time.compare_exchange_strong(
            prevtime, time + kSyncTimePeriod, std::memory_order_relaxed)) {
      return false;
    }
    return true;
  }

  bool try_timed_cleanup() {
    if (!check_sync_time(sync_time_)) {
      return false;
    }
    relaxed_cleanup(); // calling regular cleanup may self deadlock
    return true;
  }

  hazptr_rec<Atom>* try_acquire_existing_hprec() {
    auto rec = head();
    while (rec) {
      auto next = rec->next();
      if (rec->try_acquire()) {
        return rec;
      }
      rec = next;
    }
    return nullptr;
  }

  hazptr_rec<Atom>* acquire_new_hprec() {
    auto rec = hazptr_rec_alloc{}.allocate(1);
    new (rec) hazptr_rec<Atom>();
    rec->set_active();
    rec->set_domain(this);
    while (true) {
      auto h = head();
      rec->set_next(h);
      if (hazptrs_.compare_exchange_weak(
              h, rec, std::memory_order_release, std::memory_order_acquire)) {
        break;
      }
    }
    hcount_.fetch_add(1);
    return rec;
  }

  void invoke_reclamation_in_executor(int rcount) {
    auto fn = exec_fn_.load(std::memory_order_acquire);
    auto ex = fn ? fn() : get_default_executor();
    auto backlog = exec_backlog_.fetch_add(1, std::memory_order_relaxed);
    if (ex) {
      auto recl_fn = [this, rcount] {
        exec_backlog_.store(0, std::memory_order_relaxed);
        do_reclamation(rcount);
      };
      if (ex == get_default_executor()) {
        invoke_reclamation_may_deadlock(ex, recl_fn);
      } else {
        ex->add(recl_fn);
      }
    } else {
      if (kIsDebug) {
        LOG(INFO) << "Skip asynchronous reclamation by hazptr executor";
      }
    }
    if (backlog >= 10) {
      hazptr_warning_executor_backlog(backlog);
    }
  }

  template <typename Func>
  void invoke_reclamation_may_deadlock(folly::Executor* ex, Func recl_fn) {
    ex->add(recl_fn);
    // This program is using the default inline executor, which is an
    // inline executor. This is not necessarily a problem. But if this
    // program encounters deadlock, then this may be the cause. Most
    // likely this program did not call
    // folly::enable_hazptr_thread_pool_executor (which is normally
    // called by folly::init). If this is a problem check if your
    // program is missing a call to folly::init or an alternative.
  }

  FOLLY_EXPORT FOLLY_NOINLINE void hazptr_warning_list_too_large(
      uintptr_t tag, size_t shard, int count) {
    static std::atomic<uint64_t> warning_count{0};
    if ((warning_count++ % 10000) == 0) {
      LOG(WARNING) << "Hazptr retired list too large:"
                   << " tag=" << tag << " shard=" << shard
                   << " count=" << count;
    }
  }

  FOLLY_EXPORT FOLLY_NOINLINE void hazptr_warning_executor_backlog(
      int backlog) {
    static std::atomic<uint64_t> warning_count{0};
    if ((warning_count++ % 10000) == 0) {
      LOG(WARNING) << backlog
                   << " request backlog for hazptr asynchronous "
                      "reclamation executor";
    }
  }
}; // hazptr_domain

/**
 *  Free functions related to hazptr domains
 */

/** default_hazptr_domain: Returns reference to the default domain */

template <template <typename> class Atom>
struct hazptr_default_domain_helper {
  static FOLLY_ALWAYS_INLINE hazptr_domain<Atom>& get() {
    static hazptr_domain<Atom> domain;
    return domain;
  }
};

template <>
struct hazptr_default_domain_helper<std::atomic> {
  static FOLLY_ALWAYS_INLINE hazptr_domain<std::atomic>& get() {
    return default_domain;
  }
};

template <template <typename> class Atom>
FOLLY_ALWAYS_INLINE hazptr_domain<Atom>& default_hazptr_domain() {
  return hazptr_default_domain_helper<Atom>::get();
}

/** hazptr_domain_push_retired: push a list of retired objects into a domain */
template <template <typename> class Atom>
void hazptr_domain_push_retired(
    hazptr_obj_list<Atom>& l,
    bool check,
    hazptr_domain<Atom>& domain) noexcept {
  domain.push_retired(l, check);
}

/** hazptr_domain_push_list */
template <template <typename> class Atom>
void hazptr_domain_push_list(
    hazptr_obj_list<Atom>& l, hazptr_domain<Atom>& domain) noexcept {
  domain.push_list(l);
}

/** hazptr_retire */
template <template <typename> class Atom, typename T, typename D>
FOLLY_ALWAYS_INLINE void hazptr_retire(T* obj, D reclaim) {
  default_hazptr_domain<Atom>().retire(obj, std::move(reclaim));
}

/** hazptr_cleanup: Reclaims all reclaimable objects retired to the domain */
template <template <typename> class Atom>
void hazptr_cleanup(hazptr_domain<Atom>& domain) noexcept {
  domain.cleanup();
}

} // namespace folly
