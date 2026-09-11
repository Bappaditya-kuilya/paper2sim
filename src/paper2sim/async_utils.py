"""Async utilities for Paper2Sim."""


async def run_in_executor(func, *args):
    """Run a synchronous function in a thread executor."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, func, *args)
