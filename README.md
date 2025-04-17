# GIAPI – Game Inventory API

**GIAPI** (Game Inventory API) is a web application for managing RPG-style inventory. Users can create bags, add items, share their collections, and interact with others. The system supports role-based access with three roles: **Player**, **Moderator**, and **Administrator**.

### 👤 Player

- Create and edit your own bags
- Add, edit, and remove items within your own bags
- Share access to your bags with others
- Transfer ownership of bags to other users

### 🛡️ Moderator

- All player permissions
- View all bags and items from all users

### ⚙️ Administrator

- All moderator permissions
- Manage users and their roles
- Edit or delete any bags or items

## 📦 Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zetterus/GIAPI.git
   cd GIAPI
   ```

2. **Restore dependencies**:
   ```bash
   dotnet restore
   ```

3. **Apply database migrations** (if configured):
   ```bash
   dotnet ef database update
   ```

4. **Run the project**:
   ```bash
   dotnet run
   ```

5. **Open in browser**:  
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
GIAPI/
├── Controllers/        # API and MVC controllers
├── Models/             # Data models
├── Data/               # Database context and migrations
├── wwwroot/            # Static files
├── GIAPI.sln           # Solution file
└── ...
```

## ✅ Contributing

We welcome suggestions and contributions!

1. Fork the repository  
2. Create a new branch:  
   `git checkout -b feature/YourFeature`  
3. Make your changes and commit:  
   `git commit -m "Add feature"`  
4. Push your branch:  
   `git push origin feature/YourFeature`  
5. Open a pull request

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

## 📬 Contact

If you have suggestions or find a bug, feel free to [create an issue](https://github.com/zetterus/GIAPI/issues) or message [@zetterus](https://github.com/zetterus).
