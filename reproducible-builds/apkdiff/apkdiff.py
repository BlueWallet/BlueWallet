#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import re
import logging
from typing import Optional
from collections import defaultdict
from dataclasses import dataclass
from zipfile import ZipFile, BadZipFile
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element

from androguard.core import axml
from loguru import logger

from util import deep_compare, show_diffs

ALLOWED_ARSC_DIFF_PATHS = [".res1"]
ANDROID_NS = "{http://schemas.android.com/apk/res/android}"
ANDROID_NAME_ATTR = f"{ANDROID_NS}name"
ANDROID_VALUE_ATTR = f"{ANDROID_NS}value"
BUGSNAG_BUILD_UUID_KEY = "com.bugsnag.android.BUILD_UUID"
IGNORE_FILES = [
    # Related to app signing. Not expected to be present in unsigned builds. It does not affect app code.
    "META-INF/MANIFEST.MF",
    "META-INF/TEMP-KEY.SF",
    "META-INF/TEMP-KEY.RSA",
    "META-INF/MBLUEWAL.SF",
    "META-INF/MBLUEWAL.RSA",
    "META-INF/TEXTSECU.SF",
    "META-INF/TEXTSECU.RSA",
    "META-INF/BNDLTOOL.SF",
    "META-INF/BNDLTOOL.RSA",
    "META-INF/code_transparency_signed.jwt",
    "stamp-cert-sha256",
]


@dataclass
class XmlStructDiff:
    """Models the structural difference between two XML elements."""

    diff_type: str  # "tag", "attribute", "text", "child_count"
    path: str
    attr_name: Optional[str] = None
    first_val: Optional[str] = None
    second_val: Optional[str] = None
    child_tag: Optional[str] = None
    first_element_attrs: Optional[dict] = None
    second_element_attrs: Optional[dict] = None


class LoguruInterceptHandler(logging.Handler):
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        logger.opt(
            depth=6,
            exception=record.exc_info,
        ).log(level, record.getMessage())


# Force-route Python's standard logging through Loguru
logging.basicConfig(
    handlers=[LoguruInterceptHandler()],
    level=logging.DEBUG,
    force=True,
)

# Shut-up noisy libraries
logging.getLogger("deepdiff").setLevel(logging.ERROR)
logging.getLogger("androguard").setLevel(logging.ERROR)


# setup Loguru
logger.remove()
logger.add(
    sys.stderr,
    level="INFO",
    format="<green>{time:HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "{message}",
)


def open_apk(path: str) -> ZipFile:
    if not os.path.exists(path):
        logger.error("File not found: {}", path)
        sys.exit(2)
    try:
        return ZipFile(path, "r")
    except BadZipFile:
        logger.error("Invalid APK (not a valid zip archive): {}", path)
        sys.exit(2)


def cmp_entry_names(zip1: ZipFile, zip2: ZipFile) -> bool:
    """
    Compare entry names of the zip files. Returns True if they match, False otherwise
    """

    logger.info("Comparing zip entry names...")

    ignore_set = set(IGNORE_FILES)
    name_list_sorted_1 = sorted(
        [name for name in zip1.namelist() if name not in ignore_set]
    )
    name_list_sorted_2 = sorted(
        [name for name in zip2.namelist() if name not in ignore_set]
    )

    # entries matched, so get out early
    if name_list_sorted_1 == name_list_sorted_2:
        return True

    if len(name_list_sorted_1) != len(name_list_sorted_2):
        logger.info(
            "Manifest lengths differ: {} vs {}",
            len(name_list_sorted_1),
            len(name_list_sorted_2),
        )

    zip1_unique_entries = set(name_list_sorted_1)
    zip2_unique_entries = set(name_list_sorted_2)

    only_in_first = sorted(zip1_unique_entries - zip2_unique_entries)
    only_in_second = sorted(zip2_unique_entries - zip1_unique_entries)
    if only_in_first:
        logger.info("Files present only in {}:", zip1.filename)
        for name in only_in_first:
            logger.info("  - {}", name)
    if only_in_second:
        logger.info("Files present only in {}:", zip2.filename)
        for name in only_in_second:
            logger.info("  - {}", name)

    # If sets are identical but ordering differs, still report ordering mismatches
    for entry_name_1, entry_name_2 in zip(name_list_sorted_1, name_list_sorted_2):
        if entry_name_1 != entry_name_2:
            logger.info(
                "Sorted manifests don't match: {} vs {}", entry_name_1, entry_name_2
            )

    return False


def cmp_entry_contents(zip1: ZipFile, zip2: ZipFile) -> bool:
    """
    Checks for differences between the bytes of the ZIP files.

    Returns true if they match, otherwise false.
    """

    logger.info("Comparing zip entry contents...")

    ignore_set = set(IGNORE_FILES)

    # filename -> zip data
    entries1 = {
        info.filename: info
        for info in zip1.infolist()
        if info.filename not in ignore_set
    }
    entries2 = {
        info.filename: info
        for info in zip2.infolist()
        if info.filename not in ignore_set
    }

    success = True
    if len(entries1) != len(entries2):
        logger.info(
            "APK info lists of different length! {} vs {}",
            len(entries1),
            len(entries2),
        )
        success = False

    for fname, entry1_info in entries1.items():
        entry2_info = entries2.get(fname)

        # file is not present in both zips
        if not entry2_info:
            continue

        entry1_bytes = zip1.read(entry1_info)
        entry2_bytes = zip2.read(entry2_info)
        if entry1_bytes != entry2_bytes and not handle_special_cases(
            fname, entry1_bytes, entry2_bytes
        ):
            zip1.extract(entry1_info, "mismatches/first")
            zip2.extract(entry2_info, "mismatches/second")
            logger.info(
                "APKs differ on file: {}. Files extracted to the mismatches/ directory.",
                fname,
            )
            success = False

    return success


def handle_special_cases(filename: str, bytes1: bytes, bytes2: bytes):
    """
    There are some specific files that expect will not be byte-for-byte identical. We want to ensure that the files
    are matching except these expected differences. The differences are all related to extra XML attributes that the
    Play Store may add as part of the bundle process. These differences do not affect the behavior of the app and are
    unfortunately unavoidable given the modern realities of the Play Store.
    """
    if filename == "AndroidManifest.xml":
        return cmp_android_xml(bytes1, bytes2)
    if filename == "resources.arsc":
        return cmp_resources_arsc(bytes1, bytes2)
    if re.match("res/xml/splits[0-9]+\\.xml", filename):
        logger.info(f"Comparing {filename}...")
        return cmp_split_xml(bytes1, bytes2)
    return False


def cmp_android_xml(bytes1: bytes, bytes2: bytes) -> bool:
    logger.info("Comparing AndroidManifest.xml...")
    all_differences = cmp_xml(bytes1, bytes2)
    if not all_differences:
        # zero diffs found
        return True

    bad_differences = list()
    for diff in all_differences:
        is_split_attr = (
            diff.diff_type == "attribute"
            and diff.path in ["manifest", "manifest/application"]
            and diff.attr_name is not None
            and "split" in diff.attr_name.lower()
        )
        if is_split_attr:
            continue

        is_bugsnag_build_uuid = (
            diff.diff_type == "attribute"
            and diff.path == "manifest/application/meta-data"
            and diff.attr_name == ANDROID_VALUE_ATTR
            and (diff.first_element_attrs or {}).get(ANDROID_NAME_ATTR)
            == BUGSNAG_BUILD_UUID_KEY
            and (diff.second_element_attrs or {}).get(ANDROID_NAME_ATTR)
            == BUGSNAG_BUILD_UUID_KEY
        )
        if is_bugsnag_build_uuid:
            logger.warning(
                f"Ignoring Bugsnag BUILD_UUID change ({diff.first_val} -> {diff.second_val})"
            )
            continue

        bad_differences.append(diff)

    if bad_differences:
        logger.info(bad_differences)
        return False

    return True


def cmp_split_xml(bytes1: bytes, bytes2: bytes) -> bool:
    all_differences = cmp_xml(bytes1, bytes2)
    if all_differences:
        bad_differences = list()
        for diff in all_differences:
            is_language = (
                diff.diff_type == "attribute"
                and diff.path == "splits/module/language/entry"
            )
            if not is_language:
                bad_differences.append(diff)
        if bad_differences:
            logger.info(bad_differences)
            return False

    return True


def cmp_resources_arsc(first_entry_bytes: bytes, second_entry_bytes: bytes) -> bool:
    """
    Compares two resources.arsc files.
    Returns True if they are considered equivalent, False otherwise.
    """

    if first_entry_bytes == second_entry_bytes:
        return True

    logger.info("Comparing resources.arsc (may take a while)...")

    first_arsc = axml.ARSCParser(first_entry_bytes)
    second_arsc = axml.ARSCParser(second_entry_bytes)

    all_package_names = sorted(set(first_arsc.packages) | set(second_arsc.packages))
    allowed_paths = set(ALLOWED_ARSC_DIFF_PATHS)
    total_diffs = defaultdict(list)
    success = True

    for package_name in all_package_names:
        # Check if package exists in both files
        if package_name not in first_arsc.packages:
            logger.info("Package only in target file: {}", package_name)
            success = False
            continue
        if package_name not in second_arsc.packages:
            logger.info("Package only in source file: {}", package_name)
            success = False
            continue

        packages1 = first_arsc.packages[package_name]
        packages2 = second_arsc.packages[package_name]

        # Check package length
        if len(packages1) != len(packages2):
            logger.info(
                "Package length mismatch: {} vs {}", len(packages1), len(packages2)
            )
            success = False
            continue

        # Compare each package element
        total = len(packages1)
        log_interval = max(1, total // 10)  # Log at 10% intervals, minimum every item
        for idx, (pkg1, pkg2) in enumerate(zip(packages1, packages2)):
            if idx % log_interval == 0 or idx == total - 1:
                progress_pct = ((idx + 1) * 100) // total
                print(
                    f"\rProcessing package {idx + 1}/{total} ({progress_pct}%) in {package_name}...",
                    end="",
                    flush=True,
                )

            if type(pkg1) is not type(pkg2):
                logger.info(
                    "Element type mismatch at index {}: {} vs {}",
                    idx,
                    type(pkg1).__name__,
                    type(pkg2).__name__,
                )
                success = False
                continue

            type_name = type(pkg1).__name__
            match pkg1:
                case axml.ARSCResTypeSpec():
                    # TypeSpec requiring allowed path filtering
                    diffs = deep_compare(pkg1, pkg2)
                    if diffs and not all(
                        path in allowed_paths for path in diffs.keys()
                    ):
                        logger.info(
                            "Disallowed differences in ARSCResTypeSpec at index {}:",
                            idx,
                        )
                        logger.info(show_diffs(diffs))
                        total_diffs["ARSCResTypeSpec"].append((idx, diffs))
                        success = False
                case axml.ARSCResTableEntry():
                    # Table entries compared via string representation
                    repr1, repr2 = repr(pkg1), repr(pkg2)
                    if repr1 != repr2:
                        logger.info("Differences in ARSCResTableEntry at index {}", idx)
                        logger.info("Target: {}", repr1)
                        logger.info("Source: {}", repr2)
                        total_diffs["ARSCResTableEntry"].append(
                            (idx, {"representation": f"{repr1} vs {repr2}"})
                        )
                        success = False
                case list():
                    # Raw lists compared via equality
                    if pkg1 != pkg2:
                        logger.info("List difference at index {}", idx)
                        total_diffs["list"].append((idx, {"diff": "Lists differ"}))
                        success = False
                case _:
                    # Unified deep comparison for ALL other ARSC types
                    diffs = deep_compare(pkg1, pkg2)
                    if diffs:
                        logger.info("Differences in {} at index {}:", type_name, idx)
                        total_diffs[type_name].append((idx, diffs))
                        success = False

        print()  # Clear the progress line
        logger.info("Completed processing {} packages in {}", total, package_name)

    for type_name, diffs in total_diffs.items():
        if diffs:
            logger.info("  {}: {}", type_name, len(diffs))

    if not success:
        logger.error("Files have differences beyond the allowed .res1 differences.")

    return success


def cmp_xml(bytes1: bytes, bytes2: bytes) -> list[XmlStructDiff]:
    entry1_text = axml.AXMLPrinter(bytes1).get_xml().decode("utf-8")
    entry2_text = axml.AXMLPrinter(bytes2).get_xml().decode("utf-8")
    if entry1_text == entry2_text:
        return list()

    root1 = ET.fromstring(entry1_text)
    root2 = ET.fromstring(entry2_text)
    return cmp_xml_elements(root1, root2)


def cmp_xml_elements(
    root1: Element, root2: Element, initial_path: str = ""
) -> list[XmlStructDiff]:
    """Recursively compare two XML elements and return list of XmlDifference objects."""

    differences: list[XmlStructDiff] = list()
    stack: list[tuple[Element, Element, str]] = [(root1, root2, initial_path)]
    while len(stack) > 0:
        elem1, elem2, path = stack.pop()
        current_path = f"{path}/{elem1.tag}" if path else elem1.tag

        # tag mismatch breaks tree alignment; don't traverse children
        if elem1.tag != elem2.tag:
            tag_diff = XmlStructDiff(
                diff_type="tag",
                path=path,
                first_val=elem1.tag,
                second_val=elem2.tag,
            )
            differences.append(tag_diff)
            continue

        # Compare attributes
        attrs1, attrs2 = elem1.attrib, elem2.attrib
        all_keys = set(attrs1) | set(attrs2)
        for key in sorted(all_keys):
            val1, val2 = attrs1.get(key), attrs2.get(key)
            if val1 != val2:
                attr_diff = XmlStructDiff(
                    diff_type="attribute",
                    path=current_path,
                    attr_name=key,
                    first_val=val1,
                    second_val=val2,
                    first_element_attrs=dict(attrs1),
                    second_element_attrs=dict(attrs2),
                )
                differences.append(attr_diff)

        # Compare text content
        text1 = (elem1.text or "").strip()
        text2 = (elem2.text or "").strip()
        if text1 != text2:
            txt_diff = XmlStructDiff(
                diff_type="text",
                path=current_path,
                first_val=text1,
                second_val=text2,
            )
            differences.append(txt_diff)

        # Compare children
        children1_by_tag: dict[str, list[Element]] = defaultdict(list)
        children2_by_tag: dict[str, list[Element]] = defaultdict(list)
        for child in elem1:
            children1_by_tag[child.tag].append(child)
        for child in elem2:
            children2_by_tag[child.tag].append(child)

        all_child_tags = sorted(
            set(children1_by_tag) | set(children2_by_tag), reverse=True
        )
        for tag in all_child_tags:
            list1 = children1_by_tag[tag]
            list2 = children2_by_tag[tag]
            if len(list1) != len(list2):
                differences.append(
                    XmlStructDiff(
                        diff_type="child_count",
                        path=current_path,
                        child_tag=tag,
                        first_val=str(len(list1)),
                        second_val=str(len(list2)),
                    )
                )
            for child1, child2 in reversed(list(zip(list1, list2))):
                item = (child1, child2, current_path)
                stack.append(item)
    return differences


def compare(apk1, apk2) -> bool:

    def display_ignored_files():
        return ", ".join(map(lambda x: f"\n\t\t\t'{x}'", IGNORE_FILES))

    logger.info("Comparing: \n\t\t\t{}\n\t\t\t{}\n", apk1, apk2)
    logger.info("Files ignored: {}.", display_ignored_files())
    with open_apk(apk1) as zip1, open_apk(apk2) as zip2:
        return cmp_entry_names(zip1, zip2) and cmp_entry_contents(zip1, zip2)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        logger.error(
            "Not enough arguments. Usage: apkdiff <path_to_first_apk> <path_to_second_apk>"
        )
        sys.exit(1)
    if not compare(sys.argv[1], sys.argv[2]):
        logger.error("APKs do NOT match!")
        sys.exit(1)
    logger.info("APKs match correctly!")
