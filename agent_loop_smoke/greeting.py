"""Greeting module for agent_loop_smoke."""


def greet(name):
    """
    Return a greeting message for the given name.
    
    Args:
        name: The name to greet. Can be an empty string.
    
    Returns:
        A greeting string.
    """
    if not name or name.strip() == "":
        return "Hello, stranger!"
    return f"Hello, {name}!"
