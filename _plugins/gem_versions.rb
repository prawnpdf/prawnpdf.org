

module GemVersions
  def self.versions(name)
    @versions ||= {}
    @versions[name] ||=
      Dir
      .glob(File.join(File.expand_path('../docs', __dir__), name, '*'))
      .select { File.directory? _1 }
      .map { Gem::Version.new File.basename(_1) }
  end

  def self.all_versions(name)
    @all_versions ||= {}
    @all_versions[name] ||=
      versions(name)
      .flat_map { |v|
        (1..v.segments.length).map { |n|
          Gem::Version.new(v.segments.slice(0, n).join('.'))
        }
      }
      .sort
      .reverse
  end

   # Stubbed LiquidContext to support relative_url and absolute_url helpers
  class RedirectContext
    attr_reader :site

    def initialize(site)
      @site = site
    end

    def registers
      { :site => site }
    end
  end

  class RedirectPage < Jekyll::Page
    include Jekyll::Filters::URLFilters

    DEFAULT_DATA = {
      "sitemap" => false,
      "layout" => "redirect",
    }.freeze

    def initialize(site, base, dir, name, from, to)
      super(site, base, dir, name)

      @context ||= RedirectContext.new(site)

      @redirec_from = ensure_leading_slash(from)
      @redirect_to = %r!^https?://!.match?(to) ? to : absolute_url(to)

      data.merge!(
        "permalink" => redirect_from,
        "redirect" => {
          "from" => redirect_from,
          "to" => redirect_to,
        }
      )
    end

    attr_reader :redirect_from, :redirect_to

    def read_yaml(_base, _name, _opts = {})
      self.content = self.output = ""
      self.data ||= DEFAULT_DATA.dup
    end
  end

  class Generator < Jekyll::Generator
    def generate(site)
      Dir.glob(File.join(File.expand_path('../docs', __dir__), '*'))
        .select { File.directory? _1 }
        .each do |path|
          gemname = File.basename(path)
          versions = GemVersions.versions(gemname)
          all_versions = GemVersions.all_versions(gemname)
          version_map = all_versions.to_h { |v|
            req = Gem::Requirement.new("~> #{v}.0")
            best_version = versions.select { req.satisfied_by?(_1) }.max

            [v, best_version]
          }
          site.data['gems'] ||= {}
          site.data['gems'][gemname] = {
            versions: version_map,
            latest: versions.max,
          }

          version_map.each do |v, best_v|
            next if versions.any?{ v.eql? _1 }

            site.pages << RedirectPage.new(
              site, site.source, "/docs/#{gemname}/#{v}/", "index.html",
              "/docs/#{gemname}/#{v}/",
              "/docs/#{gemname}/#{best_v}/"
            )
          end

          site.pages << RedirectPage.new(
            site, site.source, "/docs/#{gemname}/", "index.html",
            "/docs/#{gemname}/",
            "/docs/#{gemname}/#{site.data['gems'][gemname][:latest]}/"
          )
        end

      site.pages << RedirectPage.new(
        site, site.source, "/docs/", "index.html",
        "/docs/",
        "/docs/prawn/#{site.data['gems']['prawn'][:latest]}/"
      )
    end
  end

  class Tag < Liquid::Tag
    def initialize(tagName, markup, options)
      super
      parts = markup.split
      case parts.length
      when 1
        @gem = parts.first
        @version = nil
      when 2
        @gem = parts.first
        @version = parts.last
      else
        raise SyntaxError, "#{tagName} requires at least 1 and at most 2 argumnts"
      end
    end

    def render(context)
      versions = GemVersions.versions(@gem)
      if @version
        req = Gem::Requirement.new("~> #{@version}.0")
        best_version = versions.select { req.satisfied_by?(_1) }.max
        best_version.to_s
      else
        versions.max.to_s
      end
    end

    Liquid::Template.register_tag "gem_version", self
  end
end
