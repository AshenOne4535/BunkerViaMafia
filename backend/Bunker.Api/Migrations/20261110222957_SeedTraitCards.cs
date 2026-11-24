using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Bunker.Api.Migrations
{
    /// <inheritdoc />
    public partial class SeedTraitCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "TraitCards",
                columns: new[] { "Id", "Category", "Description", "Value" },
                values: new object[,]
                {
                    { 1, 1, "Potrafi przeprowadzać operacje w warunkach polowych", "Lekarz chirurg" },
                    { 2, 1, "Zna się na naprawie systemów wentylacji i generatorów", "Inżynier mechanik" },
                    { 3, 1, "Specjalista od uprawy roślin i hydroponiki", "Botanik" },
                    { 4, 1, "Wyszkolenie bojowe i obsługa broni", "Żołnierz sił specjalnych" },
                    { 5, 1, "Potrafi prowadzić transmisje na żywo, brak praktycznych umiejętności przetrwania", "Influencer" },
                    { 6, 2, "Silna odporność i brak chorób przewlekłych", "Doskonałe zdrowie" },
                    { 7, 2, "Wymaga inhalatora przy wysiłku i zapyleniu", "Astma oskrzelowa" },
                    { 8, 2, "Wymaga regularnego podawania insuliny", "Cukrzyca typu 1" },
                    { 9, 2, "Bez okularów słabo widzi na odległość", "Krótkowzroczność (-5 D)" },
                    { 10, 2, "Częste kichanie i łzawienie oczu w zamkniętych pomieszczeniach", "Alergia na kurz i pleśń" },
                    { 11, 3, "Stabilna psychika w sytuacjach kryzysowych", "Brak fobii" },
                    { 12, 3, "Paniczny lęk przed zamkniętymi i ciasnymi pomieszczeniami", "Klaustrofobia" },
                    { 13, 3, "Paniczny lęk przed pająkami i owadami", "Arachnofobia" },
                    { 14, 3, "Silny lęk przed ciemnością i brakiem oświetlenia", "Nyktfobia" },
                    { 15, 3, "Obsesyjny lęk przed brudem i zarazkami", "Mizofobia" },
                    { 16, 4, "Umiejętność przetrwania w trudnych warunkach", "Survival i bushcraft" },
                    { 17, 4, "Potrafi przygotować smaczny posiłek z minimalnych zapasów", "Gotowanie z konserw" },
                    { 18, 4, "Umiejętność obsługi i naprawy sprzętu radiowego", "Krótkofalarstwo" },
                    { 19, 4, "Podnosi morale grupy podczas długiej izolacji", "Gra na gitarze" },
                    { 20, 4, "Rozwija myślenie strategiczne i organizuje czas wolny", "Gry planszowe i szachy" },
                    { 21, 5, "Zestaw opatrunków, antybiotyków i leków przeciwbólowych", "Apteczka taktyczna" },
                    { 22, 5, "Klucze, wkrętaki, lutownica i miernik napięcia", "Skrzynka z narzędziami" },
                    { 23, 5, "Hermetycznie zapakowane nasiona do uprawy w bunkrze", "Zapas nasion warzyw" },
                    { 24, 5, "Urządzenie do pomiaru poziomu promieniowania", "Licznik Geigera" },
                    { 25, 5, "Zajmuje dużo miejsca i nie daje korzyści w bunkrze", "Dmuchany jednorożec" },
                    { 26, 6, "W pełni sił fizycznych, płodny", "Mężczyzna, 28 lat" },
                    { 27, 6, "W pełni sił fizycznych, płodna", "Kobieta, 26 lat" },
                    { 28, 6, "Duże doświadczenie życiowe i dobra kondycja", "Mężczyzna, 45 lat" },
                    { 29, 6, "Dobra kondycja fizyczna, wysoka odporność na stres", "Kobieta, 34 lata" },
                    { 30, 6, "Emeryt, duże doświadczenie, ale ograniczona wydolność fizyczna", "Mężczyzna, 68 lat" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "TraitCards",
                keyColumn: "Id",
                keyValue: 30);
        }
    }
}
