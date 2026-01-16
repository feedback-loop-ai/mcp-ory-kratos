# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for Ory Kratos - an open-source identity and user management system.

## Build & Development Commands

*To be updated once the project structure is established.*

## Architecture

*To be updated once the codebase is developed.*

## Active Technologies
- TypeScript 5.x with Bun 1.x + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x (001-kratos-mcp-server)
- Vitest for testing, Biome for linting/formatting (001-kratos-mcp-server)
- N/A (stateless proxy to Kratos Admin API) (001-kratos-mcp-server)
- TypeScript 5.x (strict mode) + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x (001-kratos-mcp-server)

## Recent Changes
- 001-kratos-mcp-server: Updated stack to Bun 1.x + Biome (fast feedback loops per Constitution v1.1.0)
