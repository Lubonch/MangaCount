public interface IFormatService
{
    IEnumerable<Format> GetAll();
    Format GetById(int id);
    Format Create(Format format);
    Format Update(Format format);
    void Delete(int id);
}