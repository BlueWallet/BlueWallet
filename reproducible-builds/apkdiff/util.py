def show_diffs(diffs: dict):
    """Print the differences between APKs in a human-readable form."""

    result = list()
    stack = [(diffs, 0)]
    while len(stack) > 0:
        current_diff, indent = stack.pop()
        indented = indent * " "
        for field, data in sorted(current_diff.items(), reverse=True):
            if isinstance(data, list):
                stringified_list = "[" + ", ".join(str(item) for item in data) + "]"
                formatted = f"{indented}{field} => {stringified_list}"
                result.append(formatted)
            elif isinstance(data, dict):
                # dig deeper into nested dicts
                formatted = indented + field + " =>"
                result.append(formatted)
                stack.append((data, indent + 2))
            else:
                formatted = f"{indented}{field} => {data}"
                result.append(formatted)
    return "\n".join(result)


def deep_compare(
    obj1,
    obj2,
    path="",
    max_depth=40,
    curr_depth=0,
    exclude_attrs=None,
    include_callable=False,
) -> dict:
    """
    Recursively compares two objects and returns a dictionary of differences.

    Args:
        obj1: First object to compare
        obj2: Second object to compare
        path: Current attribute path (for nested comparisons)
        max_depth: Maximum recursion depth. Default: 40
        curr_depth: Current recursion depth
        exclude_attrs: List of attribute names to exclude from comparison
        include_callable: Whether to include callable attributes in comparison

    Returns:
        A dictionary mapping paths to differences, empty if objects are identical
    """

    default_exclude_attrs = {"__weakref__", "__dict__", "__doc__", "__module__"}
    if exclude_attrs is None:
        exclude_attrs = default_exclude_attrs
    elif isinstance(exclude_attrs, str):
        exclude_attrs = {exclude_attrs} | default_exclude_attrs
    else:
        exclude_attrs = set(exclude_attrs) | default_exclude_attrs

    def safe_sort(iterable):
        try:
            return sorted(iterable)
        except TypeError:
            return list(iterable)

    # explicit stack with tuples of: (obj1, obj2, path, current_depth)
    stack = [(obj1, obj2, path, curr_depth)]
    differences = dict()
    while len(stack) > 0:
        o1, o2, p, curr_depth = stack.pop()

        if curr_depth > max_depth:
            key = f"{p} [max depth reached]" if p else "[max depth reached]"
            differences[key] = "Reached nesting limit"
            continue

        # are they referencing the same memory or have the same data?
        if (o1 is o2) or (o2 == o1):
            continue

        if type(o1) is not type(o2):
            differences[p] = (
                f"Types do not match: {type(o1).__name__} vs {type(o2).__name__}"
            )
            continue

        if o1 is None or o2 is None:
            differences[p] = f"{o1} vs {o2}"
            continue

        # primitive types
        if isinstance(o1, (int, float, str, bool, bytes, complex)):
            differences[p] = f"{o1} vs {o2}"
            continue

        if isinstance(o1, set):
            uniq_first = o1 - o2
            uniq_second = o2 - o1
            prefix = f"{p}." if p else ""
            if uniq_first:
                differences[f"{prefix}elements_in_first_only"] = safe_sort(uniq_first)
            if uniq_second:
                differences[f"{prefix}elements_in_second_only"] = safe_sort(uniq_second)
            continue

        # sequences i.e. list & tuples
        if isinstance(o1, (list, tuple)):
            length_o1, length_o2 = len(o1), len(o2)
            if length_o1 != length_o2:
                key = f"{p}.length" if p else "length"
                differences[key] = f"{length_o1} vs {length_o2}"

            # extra elements in o1 or o2 i.e.that do not
            # fit in the minimum length of the 2 sequences
            for i in range(length_o2, length_o1):
                differences[f"{p}[{i}]"] = f"{o1[i]} vs [absent]"
            for i in range(length_o1, length_o2):
                differences[f"{p}[{i}]"] = f"[absent] vs {o2[i]}"

            # push elements that fit into the minimum length of the 2 sequences,
            # looping from the back to front (reversed so the index 0 is popped first)
            common_length = min(length_o1, length_o2)
            for i in reversed(range(common_length)):
                stack.append((o1[i], o2[i], f"{p}[{i}]", curr_depth + 1))
            continue

        # dictionaries
        if isinstance(o1, dict):
            keys_o1, keys_o2 = set(o1.keys()), set(o2.keys())
            if keys_o1 != keys_o2:
                uniq_first = keys_o1 - keys_o2
                uniq_second = keys_o2 - keys_o1
                prefix = f"{p}." if p else ""
                if uniq_first:
                    differences[f"{prefix}keys_in_first_only"] = safe_sort(uniq_first)
                if uniq_second:
                    differences[f"{prefix}keys_in_second_only"] = safe_sort(uniq_second)
            # push key-value pairs common to both of them
            common_pairs = keys_o1 & keys_o2
            for key in common_pairs:
                # use dot notation for string keys after a numeric list/tuple index
                use_dot = False
                if isinstance(key, str) and p and p[-1] == "]":
                    # check if the content before the final ] is a
                    # digit (list index)
                    try:
                        bracket_start = p.rfind("[")
                        if bracket_start < 0:
                            continue
                        content = p[bracket_start + 1 : -1]
                        int(content)  # try to parse as integer
                        use_dot = True
                    except (ValueError, IndexError):
                        pass
                if use_dot:
                    key_path = f"{p}.{key}"
                else:
                    key_path = f"{p}[{repr(key)}]"
                item = (o1[key], o2[key], key_path, curr_depth + 1)
                stack.append(item)
            continue

        # handle custom objects & classes
        try:

            def is_valid_attr(attr):
                return not (attr in exclude_attrs or attr.startswith("__"))

            attrs_o1 = dir(o1)
            for attr in filter(is_valid_attr, attrs_o1):
                attr_path = f"{p}.{attr}" if p else attr
                try:
                    val_o1 = getattr(o1, attr)
                    if callable(val_o1) and not include_callable:
                        continue
                    if not hasattr(o2, attr):
                        differences[attr_path] = f"{val_o1} vs [attribute absent]"
                        continue
                    val_o2 = getattr(o2, attr)
                    # For callables, record them directly instead of recursing
                    if callable(val_o1) and include_callable:
                        if val_o1 != val_o2:
                            differences[attr_path] = f"{val_o1} vs {val_o2}"
                        continue
                    item = (val_o1, val_o2, attr_path, curr_depth + 1)
                    stack.append(item)
                except Exception as err:
                    differences[attr_path] = f"Failed to compare: {str(err)}"
        except Exception as err:
            differences[p] = f"Failed to access attributes: {str(err)}"
    return differences
