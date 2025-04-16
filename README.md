# GIAPI - Inventory Management System

GIAPI (Game Inventory API) is a web-based inventory management system designed for managing in-game items and bags. It provides a user-friendly interface for players to create, manage, and share their inventory bags, as well as interact with other users.

## Overview

The project is built using `.NET 9` for the backend and JavaScript for the frontend. It includes features such as bag creation, item management, sharing and transferring bags, and real-time updates based on user roles.

## Installation

Follow these steps to set up the project locally:

1. Clone the repository: git clone https://github.com/your-repo/giapi.git cd giapi

2. Install dependencies:
   - For the backend:
     dotnet restore
      - For the frontend:
     Ensure you have a package manager like `npm` or `yarn` installed if needed.

3. Build the project:
   dotnet build

4. Run the project:
   dotnet run


5. Access the application in your browser at `http://localhost:5000`.

## Features

### Implemented Features
- **Bag Management**:
  - Create bags with different rarities.
  - View and manage items in bags.
  - Activate a specific bag to view its contents.

- **Item Management**:
  - Add items to bags with specified quantities.
  - Move items between bags.
  - Remove items from bags.

- **User Interaction**:
  - Share bags with other users with specific access levels (e.g., view-only, edit).
  - Transfer ownership of bags to other users.

- **Search Functionality**:
  - Search for items across all bags.
  - Search for users to share or transfer bags.

- **Role-Based Access**:
  - Different rarity options and permissions based on user roles (e.g., Player, Admin).

### Planned Features (TODO)
- Implement detailed logging for user actions.
- Add support for exporting inventory data to CSV or JSON.
- Enhance UI/UX with animations and better error handling.
- Introduce notifications for shared or transferred bags.
- Add multi-language support for the interface.

## License

This project is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)**.  
You are free to:
- Share — copy and redistribute the material in any medium or format.
- Adapt — remix, transform, and build upon the material for any purpose, even commercially.

**Under the following terms**:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

For more details, see the [license description](https://creativecommons.org/licenses/by/4.0/).   
