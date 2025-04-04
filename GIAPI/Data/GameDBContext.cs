using GIAPI.Models;
using GIAPI.Models.ItemModel;
using Microsoft.EntityFrameworkCore;

namespace GIAPI.Data
{
    public class GameDbContext : DbContext
    {
        public GameDbContext(DbContextOptions<GameDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<ItemProperty> ItemProperties { get; set; }
        public DbSet<InventoryBag> InventoryBags { get; set; }
        public DbSet<Inventory> Inventories { get; set; }
        public DbSet<InventoryBagAccess> InventoryBagAccesses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Связь User -> InventoryBag
            modelBuilder.Entity<User>()
                .HasMany(u => u.InventoryBags)
                .WithOne()
                .HasForeignKey("OwnerId") // Shadow property OwnerId в InventoryBag
                .IsRequired();

            // Связь InventoryBag -> Inventory
            modelBuilder.Entity<InventoryBag>()
                .HasMany(ib => ib.Inventories)
                .WithOne(i => i.InventoryBag)
                .HasForeignKey(i => i.InventoryBagId);

            // Связь Inventory -> Item
            modelBuilder.Entity<Inventory>()
                .HasOne(i => i.Item)
                .WithMany()
                .HasForeignKey(i => i.ItemId);

            // Связь Item -> ItemProperty
            modelBuilder.Entity<ItemProperty>()
                .HasOne(ip => ip.Item)
                .WithMany(i => i.Properties)
                .HasForeignKey(ip => ip.ItemId);

            // Связь InventoryBag -> InventoryBagAccess
            modelBuilder.Entity<InventoryBagAccess>()
                .HasOne(iba => iba.InventoryBag)
                .WithMany(ib => ib.Accesses)
                .HasForeignKey(iba => iba.InventoryBagId);

            // Связь InventoryBagAccess -> User
            modelBuilder.Entity<InventoryBagAccess>()
                .HasOne(iba => iba.User)
                .WithMany()
                .HasForeignKey(iba => iba.UserId);
        }
    }
}