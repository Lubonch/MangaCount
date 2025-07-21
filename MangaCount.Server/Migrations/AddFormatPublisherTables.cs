public partial class AddFormatPublisherTables : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Formats",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(nullable: false)
            },
            constraints: table => { table.PrimaryKey("PK_Formats", x => x.Id); });

        migrationBuilder.CreateTable(
            name: "Publishers",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(nullable: false)
            },
            constraints: table => { table.PrimaryKey("PK_Publishers", x => x.Id); });

        migrationBuilder.AddColumn<int>(
            name: "FormatId",
            table: "Manga",
            nullable: false,
            defaultValue: 1);

        migrationBuilder.AddColumn<int>(
            name: "PublisherId",
            table: "Manga",
            nullable: false,
            defaultValue: 1);

        migrationBuilder.AddForeignKey(
            name: "FK_Manga_Formats_FormatId",
            table: "Manga",
            column: "FormatId",
            principalTable: "Formats",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);

        migrationBuilder.AddForeignKey(
            name: "FK_Manga_Publishers_PublisherId",
            table: "Manga",
            column: "PublisherId",
            principalTable: "Publishers",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_Manga_Formats_FormatId", "Manga");
        migrationBuilder.DropForeignKey("FK_Manga_Publishers_PublisherId", "Manga");
        migrationBuilder.DropColumn("FormatId", "Manga");
        migrationBuilder.DropColumn("PublisherId", "Manga");
        migrationBuilder.DropTable("Formats");
        migrationBuilder.DropTable("Publishers");
    }
}