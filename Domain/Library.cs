using Newtonsoft.Json;

namespace MangaCount.Domain
{
    [Serializable]
    public class Library
    {
        [JsonProperty("bib_key")]
        public required String ISBN { get; set; }
        [JsonProperty("details")]
        public required Details Details { get; set; }

    }
    [Serializable]
    public class Details
    {
        [JsonProperty("publishers")]
        public required String[] Publishers { get; set; }
        [JsonProperty("title")]
        public required string Title { get; set; }
    }
}
