"""Unit tests for the greeting module."""

import unittest
from greeting import greet


class TestGreeting(unittest.TestCase):
    """Test cases for the greet function."""

    def test_greet_with_ada(self):
        """Test greeting with the name 'Ada'."""
        result = greet("Ada")
        self.assertEqual(result, "Hello, Ada!")

    def test_greet_with_empty_name(self):
        """Test greeting with an empty name."""
        result = greet("")
        self.assertEqual(result, "Hello, stranger!")


if __name__ == "__main__":
    unittest.main()
