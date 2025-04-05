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
            modelBuilder.Entity<User>()
                .HasMany(u => u.InventoryBags)
                .WithOne(ib => ib.Owner)
                .HasForeignKey(ib => ib.OwnerId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict); // Отключаем каскадное удаление

            modelBuilder.Entity<InventoryBag>()
                .HasMany(ib => ib.Inventories)
                .WithOne(i => i.InventoryBag)
                .HasForeignKey(i => i.InventoryBagId)
                .OnDelete(DeleteBehavior.Cascade); // Каскадное удаление для содержимого сумки

            modelBuilder.Entity<Inventory>()
                .HasOne(i => i.Item)
                .WithMany()
                .HasForeignKey(i => i.ItemId)
                .OnDelete(DeleteBehavior.Restrict); // Без каскада

            modelBuilder.Entity<ItemProperty>()
                .HasOne(ip => ip.Item)
                .WithMany(i => i.Properties)
                .HasForeignKey(ip => ip.ItemId)
                .OnDelete(DeleteBehavior.Cascade); // Каскад для свойств предмета

            modelBuilder.Entity<InventoryBagAccess>()
                .HasOne(iba => iba.InventoryBag)
                .WithMany(ib => ib.Accesses)
                .HasForeignKey(iba => iba.InventoryBagId)
                .OnDelete(DeleteBehavior.Cascade); // Каскад для прав доступа

            modelBuilder.Entity<InventoryBagAccess>()
                .HasOne(iba => iba.User)
                .WithMany()
                .HasForeignKey(iba => iba.UserId)
                .OnDelete(DeleteBehavior.Restrict); // Без каскада
        }
    }
}