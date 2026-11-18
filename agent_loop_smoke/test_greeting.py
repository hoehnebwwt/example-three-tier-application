import unittest
from greeting import greet


class TestGreeting(unittest.TestCase):
    def test_greet_ada(self):
        """Test greeting with name 'Ada'."""
        self.assertEqual(greet('Ada'), 'Hello, Ada!')

    def test_greet_empty_name(self):
        """Test greeting with empty name."""
        self.assertEqual(greet(''), 'Hello, !')


if __name__ == '__main__':
    unittest.main()
