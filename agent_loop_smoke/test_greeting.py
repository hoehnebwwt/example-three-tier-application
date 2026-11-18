import unittest
from greeting import greet


class TestGreeting(unittest.TestCase):
    def test_greet_with_ada(self):
        """Test greet function with name 'Ada'."""
        self.assertEqual(greet('Ada'), 'ello, Ada!')

    def test_greet_with_empty_name(self):
        """Test greet function with empty name."""
        self.assertEqual(greet(''), 'ello, !')


if __name__ == '__main__':
    unittest.main()
