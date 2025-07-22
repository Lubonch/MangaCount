using Newtonsoft.Json;

namespace MangaCount.Server.Domain
{
   [Serializable]
    public class Library
    {
        [JsonProperty("bib_key")]
        public required String bib_key { get; set; }
        [JsonProperty("details")]
        public required Details details { get; set; }

    }
    [Serializable]
    public class Details
    {
        [JsonProperty("publishers")]
        public required String[] publishers { get; set; }
        [JsonProperty("title")]
        public required string title { get; set; }
    }
    
}
