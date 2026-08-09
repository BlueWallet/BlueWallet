import pytest
from dataclasses import dataclass

from util import deep_compare, show_diffs

# tests for deep_compare

class TestDeepCompare:

    def test_identical_objects_return_empty_dict(self):
        assert deep_compare(10, 10) == {}
        assert deep_compare("hello", "hello") == {}
        assert deep_compare([1, 2, 3], [1, 2, 3]) == {}
        assert deep_compare({"a": 1, "b": [2, 3]}, {"a": 1, "b": [2, 3]}) == {}

    def test_primitive_value_and_type_mismatches(self):
        # Value mismatch
        diffs = deep_compare(10, 20)
        assert diffs == {"": "10 vs 20"}

        # Type mismatch
        diffs = deep_compare(10, "10")
        assert diffs == {"": "Types do not match: int vs str"}

        # None comparison
        diffs = deep_compare(None, "data")
        assert diffs == {"": "Types do not match: NoneType vs str"}

    def test_sequences_lists_and_tuples(self):
        # Mismatched lengths and elements
        obj1 = [1, 2, 3, 4]
        obj2 = [1, 20, 3]
        diffs = deep_compare(obj1, obj2)

        assert diffs["length"] == "4 vs 3"
        assert diffs["[1]"] == "2 vs 20"
        assert diffs["[3]"] == "4 vs [absent]"

    def test_dictionaries(self):
        dict1 = {"a": 1, "b": 2, "c": 3}
        dict2 = {"a": 1, "b": 20, "d": 4}

        diffs = deep_compare(dict1, dict2)

        assert diffs["keys_in_first_only"] == ["c"]
        assert diffs["keys_in_second_only"] == ["d"]
        assert diffs["['b']"] == "2 vs 20"

    def test_sets(self):
        set1 = {1, 2, 3}
        set2 = {2, 3, 4, 5}

        diffs = deep_compare(set1, set2)

        assert diffs["elements_in_first_only"] == [1]
        assert diffs["elements_in_second_only"] == [4, 5]

    def test_max_depth_exceeded(self):
        nested1 = {"a": {"b": {"c": 1}}}
        nested2 = {"a": {"b": {"c": 2}}}

        diffs = deep_compare(nested1, nested2, max_depth=1)
        assert "['a']['b'] [max depth reached]" in diffs
        assert diffs["['a']['b'] [max depth reached]"] == "Reached nesting limit"

    def test_custom_objects(self):
        @dataclass
        class Person:
            name: str
            age: int

        p1 = Person(name="Alice", age=30)
        p2 = Person(name="Alice", age=31)

        diffs = deep_compare(p1, p2)
        assert "age" in diffs
        assert diffs["age"] == "30 vs 31"

    def test_exclude_attributes_and_callables(self):
        class Dummy:
            def __init__(self, x, y):
                self.x = x
                self.y = y

            def action(self):
                return self.x + self.y

        d1 = Dummy(1, 10)
        d2 = Dummy(2, 10)

        # Exclude 'x', should yield no differences
        diffs = deep_compare(d1, d2, exclude_attrs=["x"])
        assert diffs == {}

        # Include callable attributes
        diffs_callable = deep_compare(d1, d2, include_callable=True)
        assert any("action" in key for key in diffs_callable)


# tests for show_diffs

class TestShowDiffs:

    def test_show_diffs_flat_dictionary(self):
        diffs = {
            "path.to.field": "val1 vs val2",
            "length": "3 vs 2",
        }
        output = show_diffs(diffs)

        expected = "path.to.field => val1 vs val2\nlength => 3 vs 2"
        assert output == expected

    def test_show_diffs_with_list_data(self):
        diffs = {
            "keys_only_in_first": ["keyA", "keyB"],
        }
        output = show_diffs(diffs)

        assert output == "keys_only_in_first => [keyA, keyB]"

    def test_show_diffs_nested_dictionary_indentation(self):
        diffs = {"root": {"child": "1 vs 2"}}
        output = show_diffs(diffs)

        expected = "root =>\n  child => 1 vs 2"
        assert output == expected

    def test_show_diffs_empty_dict(self):
        assert show_diffs({}) == ""


# integration test for deep_compare and show_diffs

def test_integration_deep_compare_and_show_diffs():
    obj1 = {"users": [{"name": "Alice", "role": "admin"}]}
    obj2 = {"users": [{"name": "Alice", "role": "user"}]}

    diffs = deep_compare(obj1, obj2)
    formatted_output = show_diffs(diffs)

    assert "['users'][0].role => admin vs user" in formatted_output
